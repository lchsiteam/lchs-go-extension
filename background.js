import "https://unpkg.com/dayjs@1.10.8/dayjs.min.js";
import "https://unpkg.com/dayjs@1.10.8/plugin/isBetween.js";
import "https://unpkg.com/dayjs@1.10.8/plugin/advancedFormat.js";
import "https://unpkg.com/dayjs@1.10.8/plugin/customParseFormat.js";

dayjs.extend(dayjs_plugin_isBetween);
dayjs.extend(dayjs_plugin_advancedFormat);
dayjs.extend(dayjs_plugin_customParseFormat);


const readStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (value) {
            if (value[key] === undefined) {
                if(key == "settingsJSON") {
                    value[key] = '{"setting":"settings","showExtraPeriods":false,"sixthEnabled":true,"zeroEnabled":true,"twentyFourHour":false,"showAMPM":false,"inlinePeriodDetails":true,"colorTheme":3,"grade":"GRADE_9","language":"ENGLISH"}';
                } else if(key == "customNamesJSON") {
                    value[key] = '{}';
                }
            }

            resolve(value[key]);
        });
    });
};

async function getStorage(key) {
    return await readStorage(key);
}



var currentPeriod;
var periodName;
var timeLeft;

var schedule;
var language;
var settings;
var customNames;

Promise.all([
    fetch("http://127.0.0.1:5500/schedule.json").then(response => response.json()),
    fetch("http://127.0.0.1:5500/languages.json").then(response => response.json()),
    getStorage("settingsJSON"),
    getStorage("customNamesJSON")
]).then(result => {
    schedule = result[0];
    language = result[1];
    settings = JSON.parse(result[2]);
    customNames = JSON.parse(result[3]);

    updateBadge();
})


function updateBadge() {
    getSchedule(dayjs()).forEach((p) => {
        if (isCurrent(p)) {
            currentPeriod = p;
        }
    });

    console.log(currentPeriod);

    if (currentPeriod.passing) {
        let tmp = currentPeriod.name.split(",");
        periodName = translateWithInsert(tmp[0], tmp[1]);
    } else {
        periodName = translate(currentPeriod.name);
    }
    timeLeft = dayjs(currentPeriod.end, "HH:mm A").diff(dayjs(), "minutes") + 1;

    let remainingHours = Math.floor(timeLeft / 60);
    // let remainingMinutes = timeLeft - (remainingHours * 60);

    // Set the extension tooltip to current period name
    chrome.action.setTitle({ title: periodName })

    if (remainingHours >= 2) {
        // green
        chrome.action.setBadgeBackgroundColor({ color: [39, 174, 96, 255] });
        chrome.action.setBadgeText({ text: String(remainingHours + 'h') });
    }
    else {
        if (timeLeft <= 5) {
            // red
            chrome.action.setBadgeBackgroundColor({ color: [192, 57, 43, 255] });
            chrome.action.setBadgeText({ text: String(timeLeft) });
        }
        else if (timeLeft <= 10) {
            // yellow
            chrome.action.setBadgeBackgroundColor({ color: [243, 156, 18, 255] });
            chrome.action.setBadgeText({ text: String(timeLeft) });
        }
        else {
            // green
            chrome.action.setBadgeBackgroundColor({ color: [39, 174, 96, 255] });
            chrome.action.setBadgeText({ text: String(timeLeft) });
        }
    }

    return;
}

function isCurrent(period) {
  return dayjs().isBetween(dayjs(period.start, "HH:mm A"), dayjs(period.end, "HH:mm A"));
}

function getSchedule(date) {
    if (date == null) return;
    var scheduleType;
    var localJSON = [];

    // Check if an override exists
    if (Object.keys(schedule.overrides.all).includes(date.format("MM/DD/YYYY"))) {
        scheduleType = schedule.overrides.all[date.format("MM/DD/YYYY")];
    } else if (Object.keys(schedule.overrides[settings.grade]).includes(date.format("MM/DD/YYYY"))) {
        scheduleType = schedule.overrides[settings.grade][date.format("MM/DD/YYYY")];
    } else { // Check if today is in a range
        if (inRange(date, "SUMMER_BREAK")) {
            scheduleType = "SUMMER_BREAK";
        } else if (inRange(date, "WINTER_BREAK")) {
            scheduleType = "WINTER_BREAK";
        } else if (inRange(date, "SPRING_BREAK")) {
            scheduleType = "SPRING_BREAK";
        } else if (inRange(date, "FALL_BREAK")) {
            scheduleType = "FALL_BREAK";
        } else {
            scheduleType = schedule.defaults[date.day()];
        }
        if (inRange(date, "BLOCK_SWITCH")) {
            if (scheduleType == "BLOCK_EVEN") { scheduleType = "BLOCK_ODD"; }
            else if (scheduleType == "BLOCK_ODD") { scheduleType = "BLOCK_EVEN"; }
        }
    }

    // Add the periods and passing periods the json
    if (scheduleType != "NONE" && !scheduleType.includes("BREAK")) {
        var previousEnd;
        switch (settings.grade) {
            case "GRADE_7":
            case "GRADE_8":
                Object.keys(schedule.gradeLevels.middleSchool[scheduleType]).forEach(
                    (period) => {
                        if (previousEnd != undefined) {
                            localJSON.push({
                                name: "PASSING_BEFORE," + period,
                                start: previousEnd,
                                end: schedule.gradeLevels.middleSchool[scheduleType][period][0],
                                passing: true,
                            });
                        }
                        localJSON.push({
                            name: period,
                            start: schedule.gradeLevels.middleSchool[scheduleType][period][0],
                            end: schedule.gradeLevels.middleSchool[scheduleType][period][1],
                            passing: false,
                        });
                        previousEnd = schedule.gradeLevels.middleSchool[scheduleType][period][1];
                    }
                );
                break;
            case "GRADE_9":
            case "GRADE_10":
            case "GRADE_11":
            case "GRADE_12":
                Object.keys(schedule.gradeLevels.highSchool[scheduleType]).forEach(
                    (period) => {
                        if (previousEnd != undefined) {
                            localJSON.push({
                                name: "PASSING_BEFORE," + period,
                                start: previousEnd,
                                end: schedule.gradeLevels.highSchool[scheduleType][period][0],
                                passing: true,
                            });
                        }
                        localJSON.push({
                            name: period,
                            start: schedule.gradeLevels.highSchool[scheduleType][period][0],
                            end: schedule.gradeLevels.highSchool[scheduleType][period][1],
                            passing: false,
                        });
                        previousEnd =
                            schedule.gradeLevels.highSchool[scheduleType][period][1];
                    }
                );
                break;
        }
        if (settings.grade >= 9) {

        }

        // Add before and after school
        localJSON = [
            {
                name: "BEFORE_SCHOOL",
                start: dayjs().startOf("day"),
                end: localJSON[0].start,
                passing: true,
            },
            ...localJSON,
            {
                name: "AFTER_SCHOOL",
                start: localJSON[localJSON.length - 1].end,
                end: dayjs().endOf("day"),
                passing: true,
            },
        ];
    } else { // Add only no school
        localJSON = [
            {
                name: "NONE",
                start: dayjs().startOf("day"),
                end: dayjs().endOf("day"),
                passing: false,
            },
        ];
    }

    // Add the scheduleType to the json
    localJSON.scheduleType = scheduleType;
    return localJSON;
}

// Function - Check if a date is in a date from the schedule.json
function inRange(date, range) {
    return date.startOf().add(1, 'hour').isBetween(dayjs(schedule.dateRanges[range][0], "MM/DD/YYYY").startOf('day'), dayjs(schedule.dateRanges[range][1], "MM/DD/YYYY").endOf('day'));
}

function getEvent(date) {
    if (date.year() in eventsJSON) {
        return eventsJSON[date.year()][dayjs.months()[date.month()]][date.date()]
    }
    return undefined
}

function translate(translateText) {
    if (customNames[translateText] != null) {
        return customNames[translateText];
    } else {
        if (language[translateText] == null) {
            return translateText;
        } else {
            return language[translateText];
        }
    }
}

// Function - Used to translate a key to the selected language and insert other text if possible.
function translateWithInsert(translateText, insertString) {
    var returnText = translate(translateText);
    var index = returnText.indexOf("{}");
    if (index < 0) {
        return translate(translateText);
    }
    return returnText.slice(0, index) + insertString + returnText.slice(index + 2);
}