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

getStorage().then(result => console.log(result));