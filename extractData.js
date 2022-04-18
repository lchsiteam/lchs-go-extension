window.addEventListener("message", function (event) {
    if(event.data.settingsChanged) {
        chrome.storage.local.set({
            settingsJSON: localStorage.getItem("settings")
        }, function () {});
    }
    else if(event.data.namesChanged) {
        chrome.storage.local.set({
            customNamesJSON: localStorage.getItem("customNamesJSON")
        }, function () {});
    }
});