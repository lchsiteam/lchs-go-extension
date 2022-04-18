window.addEventListener("message", function (event) {
    if (event.data.settingsChanged) {
        chrome.storage.local.set({
            settingsJSON: localStorage.getItem("settings")
        }, function () {});
    }
});