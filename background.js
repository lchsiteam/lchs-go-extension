import "https://unpkg.com/dayjs@1.10.8/dayjs.min.js";
import "https://unpkg.com/dayjs@1.10.8/plugin/isBetween.js";
import "https://unpkg.com/dayjs@1.10.8/plugin/advancedFormat.js";
import "https://unpkg.com/dayjs@1.10.8/plugin/customParseFormat.js";

dayjs.extend(dayjs_plugin_isBetween);
dayjs.extend(dayjs_plugin_advancedFormat);
dayjs.extend(dayjs_plugin_customParseFormat);


const readStorage = async (settingsJSON) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([settingsJSON], function (value) {
            if (value[settingsJSON] === undefined) {
                value.settingsJSON = '{"setting":"settings","showExtraPeriods":false,"sixthEnabled":true,"zeroEnabled":true,"twentyFourHour":false,"showAMPM":false,"inlinePeriodDetails":true,"colorTheme":3,"grade":"GRADE_9","language":"ENGLISH"}';
            }

            resolve(value[settingsJSON]);
        });
    });
};

async function getStorage() {
    return await readStorage('settingsJSON');
}


var customNamesJSON = { "NONE": "Custom Name" };

var currentPeriod;
var periodName;
var timeLeft;

var scheduleJSON;
var languageJSON;
var settings;



fetch("https://betago.lciteam.club/languages.json")
    .then(response => response.json())
    .then(data => {
        languageJSON = data;
        fetch("https://betago.lciteam.club/schedule.json")
            .then(response => response.json())
            .then(data => {
                scheduleJSON = data;
                getStorage().then(result => {
                    settings = JSON.parse(result);
                    updateBadge();
                });
            });
});

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
    timeLeft = currentPeriod.end.diff(dayjs(), "minutes") + 1;

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
    return dayjs().isBetween(period.start, period.end);
}

function getSchedule(date) {
    if (date == null) return;
    var scheduleType;
    var localJSON = [];

    // Check if an override exists
    if (Object.keys(scheduleJSON.overrides.all).includes(date.format("MM/DD/YYYY"))) {
        scheduleType = scheduleJSON.overrides.all[date.format("MM/DD/YYYY")];
    } else if (Object.keys(scheduleJSON.overrides[settings.grade]).includes(date.format("MM/DD/YYYY"))) {
        scheduleType = scheduleJSON.overrides[settings.grade][date.format("MM/DD/YYYY")];
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
            scheduleType = scheduleJSON.defaults[date.day()];
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
                Object.keys(scheduleJSON.gradeLevels.middleSchool[scheduleType]).forEach(
                    (period) => {
                        if (previousEnd != undefined) {
                            localJSON.push({
                                name: "PASSING_BEFORE," + period,
                                start: previousEnd,
                                end: scheduleJSON.gradeLevels.middleSchool[scheduleType][period][0],
                                passing: true,
                            });
                        }
                        localJSON.push({
                            name: period,
                            start: scheduleJSON.gradeLevels.middleSchool[scheduleType][period][0],
                            end: scheduleJSON.gradeLevels.middleSchool[scheduleType][period][1],
                            passing: false,
                        });
                        previousEnd = scheduleJSON.gradeLevels.middleSchool[scheduleType][period][1];
                    }
                );
                break;
            case "GRADE_9":
            case "GRADE_10":
            case "GRADE_11":
            case "GRADE_12":
                Object.keys(scheduleJSON.gradeLevels.highSchool[scheduleType]).forEach(
                    (period) => {
                        if (previousEnd != undefined) {
                            localJSON.push({
                                name: "PASSING_BEFORE," + period,
                                start: previousEnd,
                                end: scheduleJSON.gradeLevels.highSchool[scheduleType][period][0],
                                passing: true,
                            });
                        }
                        localJSON.push({
                            name: period,
                            start: scheduleJSON.gradeLevels.highSchool[scheduleType][period][0],
                            end: scheduleJSON.gradeLevels.highSchool[scheduleType][period][1],
                            passing: false,
                        });
                        previousEnd =
                            scheduleJSON.gradeLevels.highSchool[scheduleType][period][1];
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
    return date.startOf().add(1, 'hour').isBetween(dayjs(scheduleJSON.dateRanges[range][0], "MM/DD/YYYY").startOf('day'), dayjs(scheduleJSON.dateRanges[range][1], "MM/DD/YYYY").endOf('day'));
}

function getEvent(date) {
    if (date.year() in eventsJSON) {
        return eventsJSON[date.year()][dayjs.months()[date.month()]][date.date()]
    }
    return undefined
}

function translate(translateText) {
    if (customNamesJSON[translateText] != null) {
        return customNamesJSON[translateText];
    } else {
        if (languageJSON[translateText] == null) {
            return translateText;
        } else {
            return languageJSON[translateText];
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