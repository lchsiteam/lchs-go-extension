var settings = {};

chrome.storage.local.get(['settingsJSON'], function(response) {
	if(response.settingsJSON == undefined) {
		// set default settings if undefined
		response = {settingsJSON: '{"setting":"settings","showExtraPeriods":false,"sixthEnabled":true,"zeroEnabled":true,"twentyFourHour":false,"showAMPM":false,"inlinePeriodDetails":true,"colorTheme":3,"grade":"GRADE_9","language":"ENGLISH"}'}
	}
	console.log(response.settingsJSON);
	console.log(JSON.parse(response.settingsJSON));
	settings = JSON.parse(response.settingsJSON);
});

console.log(settings);