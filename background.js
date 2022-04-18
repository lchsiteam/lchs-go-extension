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


var languageJSON = { "ENGLISH": "English", "SPANISH": "Español", "GERMAN": "Deutsch", "FRENCH": "Français", "NOW": "NOW", "CALENDAR": "CALENDAR", "SETTINGS": "SETTINGS", "CALENDAR_TITLE": "Calendar", "SETTINGS_TITLE": "App Settings", "MORNING": "Good Morning.", "AFTERNOON": "Good Afternoon.", "EVENING": "Good Evening.", "TODAY_IS": "Today is {} schedule.", "HOUR_ABBREVIATION": "hr.", "MINUTE_ABBREVIATION": "min.", "PERIOD_NAME": "Period", "PERIOD_START": "Start", "PERIOD_END": "End", "BEFORE_SCHOOL": "Before School", "AFTER_SCHOOL": "After School", "PERIOD_0": "Period 0", "PERIOD_1": "Period 1", "PERIOD_2": "Period 2", "PERIOD_3": "Period 3", "PERIOD_4": "Period 4", "PERIOD_5": "Period 5", "PERIOD_6": "Period 6", "STEP_ODD": "STEP (odd)", "STEP_EVEN": "STEP (even)", "ASSEMBLY": "Assembly", "PASSING_BEFORE": "Passing before {}", "BREAK": "Break", "LUNCH": "Lunch", "REGULAR": "Regular", "BLOCK_ODD": "Block (odd)", "BLOCK_EVEN": "Block (even)", "NONE": "No School", "MINIMUM": "Half Day", "SUMMER_BREAK": "Summer Break", "WINTER_BREAK": "Winter Break", "SPRING_BREAK": "Spring Break", "FALL_BREAK": "Thanksgiving Break", "UNITL_END": " until period ends", "PERCENT_COMPLETED": "({}% completed)", "SETTINGS_NOTIFICATION_TITLE": "Notifications", "SETTINGS_NOTIFICATION_DESC": "Enable notifications (Experimental)", "SETTINGS_ANIMATIONS_TITLE": "Animations", "SETTINGS_ANIMATIONS_DESC": "Enable animations (Experimental)", "SETTINGS_EXTRA_PERIODS_TITLE": "Extra Periods", "SETTINGS_EXTRA_PERIODS_DESC": "Displays passing periods in the schedule", "SETTINGS_SIXTH_PERIOD_TITLE": "Sixth Period", "SETTINGS_SIXTH_PERIOD_DESC": "Shows the sixth period in the schedule", "SETTINGS_ZERO_PERIOD_TITLE": "Zero Period", "SETTINGS_ZERO_PERIOD_DESC": "Shows zero period in the schedule", "SETTINGS_TWENTY_FOUR_HOUR_TITLE": "24hr Clock", "SETTINGS_TWENTY_FOUR_HOUR_DESC": "Displays 24 hour time", "SETTINGS_AM_PM_TITLE": "AM / PM", "SETTINGS_AM_PM_DESC": "Shows AM and PM on the times", "SETTINGS_INLINE_DETAILS_TITLE": "Inline Period Details", "SETTINGS_INLINE_DETAILS_DESC": "Shows the period details in the period list on small screens", "SETTINGS_SHOW_WEEKENDS_TITLE": "Weekends", "SETTINGS_SHOW_WEEKENDS_DESC": "Shows the weekends on the calendar", "SETTINGS_COLOR_THEME_TITLE": "Color Theme", "SETTINGS_COLOR_THEME_DESC": "Changes the background color", "SETTINGS_GRADE_LEVEL_TITLE": "Grade Level", "SETTINGS_GRADE_LEVEL_DESC": "Changes the grade level for the schedule", "SETTINGS_LANGUAGE_TITLE": "Language", "SETTINGS_LANGUAGE_DESC": "Change your language", "TRUE": "True", "FALSE": "False", "YES": "Yes", "NO": "No", "ON": "On", "OFF": "Off", "GRADE_7": "7th Grade", "GRADE_8": "8th Grade", "GRADE_9": "9th Grade", "GRADE_10": "10th Grade", "GRADE_11": "11th Grade", "GRADE_12": "12th Grade", "JANUARY": "January", "FEBURARY": "February", "MARCH": "March", "APRIL": "April", "MAY": "May", "JUNE": "June", "JULY": "July", "AUGUST": "August", "SEPTEMBER": "September", "OCTOBER": "October", "NOVEMBER": "November", "DECEMBER": "December", "version": 19.6, "language": "ENGLISH" };
var customNamesJSON = { "NONE": "Custom Name" };

var currentPeriod;
var periodName;
var timeLeft;

var scheduleJSON;
var settings;



fetch("https://betago.lciteam.club/schedule.json")
.then(response => response.json())
.then(data => {
    scheduleJSON = data;
    console.log(scheduleJSON);
    getStorage().then(result => {
        settings = JSON.parse(result);
        updateBadge();
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