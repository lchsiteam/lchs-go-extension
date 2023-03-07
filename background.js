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

function createAlarm() {
  chrome.alarms.clearAll();
  fetchData();
  updateBadge();

  var calcDate = new Date();
  if (calcDate.getSeconds() > 0) {
    calcDate.setMinutes(calcDate.getMinutes() + 1);
    calcDate.setSeconds(0);
  }
  const alarmStart = Date.parse(calcDate);

  chrome.alarms.create("updateAlarm", { periodInMinutes: 1, when: alarmStart });
}

createAlarm();

chrome.alarms.onAlarm.addListener(function (alarm) {
  fetchData();
  updateBadge();
});

//setInterval(fetchData, 10000);
//setInterval(updateBadge, 5000);
    
function fetchData() {
    Promise.all([
        fetch("https://betago.lciteam.club/schedule.json").then((response) => response.json(), () => null),
        fetch("https://betago.lciteam.club/languages.json").then((response) => response.json(), () => null),
    ]).then(result => {
        if(result[0] != null) {
            chrome.storage.local.set({
                scheduleJSON: result[0]
            });
        }
        if(result[1] != null) {
            chrome.storage.local.set({
                languagesJSON: result[1]
            });
        }
    })
}

function updateBadge() {
    Promise.all([
        getStorage("scheduleJSON"),
        getStorage("languagesJSON"),
        getStorage("settingsJSON"),
        getStorage("customNamesJSON")
    ]).then(result => {
        schedule = result[0];
        language = result[1];
        settings = JSON.parse(result[2]);
        customNames = JSON.parse(result[3]);

        console.log("result: " + result)

        for(let i = 0; i <= 3; i++) {
            if(result[i] == undefined) {
                console.log(i);
                return;
            }
        }

        getSchedule(dayjs()).forEach((p) => {
            if (isCurrent(p)) {
                currentPeriod = p;
            }
        });

        console.log(currentPeriod);

        if (currentPeriod.passing) {
            let tmp = currentPeriod.name.split(",");
            periodName = translateWithInsert(tmp[0], translate(tmp[1]));
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
})
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
        var isBreak = inBreak(date);
        var isCustomWeek = inCustomWeek(date);
        if (isBreak) {
            scheduleType = isBreak;
        } else if (isCustomWeek) {
            scheduleType = schedule.customWeeks[isCustomWeek][date.day()];
        } else {
            scheduleType = schedule.defaults[date.day()];
        }
    }

    // Add the periods and passing periods the json
    if (scheduleType != "NONE" && !Object.keys(scheduleJSON.dateRanges.breaks).includes(scheduleType)) {
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

// Function - Check if a date is in a break from the schedule.json and get that break if so
function inBreak(date) {
    var breakType = false;
    for (var range in schedule.dateRanges.breaks) {
        if (date.startOf().add(1, 'hour').isBetween(dayjs(schedule.dateRanges.breaks[range][0], "MM/DD/YYYY").startOf('day'), dayjs(schedule.dateRanges.breaks[range][1], "MM/DD/YYYY").endOf('day'))) {
            breakType = range;
            break;
        }
    }
    return breakType;
}

// Function - Check if a date is in a custom week from the schedule.json and get that week if so
function inCustomWeek(date) {
    var weekType = false;
    for (var range in schedule.dateRanges.customWeeks) {
        if (date.startOf().add(1, 'hour').isBetween(dayjs(schedule.dateRanges.customWeeks[range][0], "MM/DD/YYYY").startOf('day'), dayjs(schedule.dateRanges.customWeeks[range][1], "MM/DD/YYYY").endOf('day'))) {
            weekType = range;
            break;
        }
    }
    return weekType;
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
        if (language[settings.language][translateText] == null) {
            return translateText;
        } else {
            return language[settings.language][translateText];
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

// Notify the user before period starts or ends
export function sendNotification(period, timeLeft) {
  if (settings.notificationToggle) {
    var nextPeriod = null;
    getSchedule(dayjs()).forEach((p) => {
      if(p.getStart() == period.getEnd()) {
        nextPeriod = p;
    }});
    if (nextPeriod && !nextPeriod.passing && nextPeriod.isVisible() && timeLeft == parseInt(settings.notificationStart)) { // period start notif
      const notification = new Notification("LCHS Go", { body: nextPeriod.getName() + translateWithInsert("NOTIFY_START", translate(settings.notificationStart)), icon: "/icon.png" } );
    }
    else if (!period.passing && period.isVisible() && timeLeft == parseInt(settings.notificationEnd)) { // period end notif
      const notification = new Notification("LCHS Go", { body: period.getName() + translateWithInsert("NOTIFY_END", translate(settings.notificationEnd)), icon: "/icon.png" } );
    }
  }
}
