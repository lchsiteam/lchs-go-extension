window.addEventListener("message", function(event) {
    if(event.data.settingsChanged) {
        chrome.storage.local.set({settingsJSON: localStorage.getItem("settings")}, function() {
          });

          chrome.storage.local.get(['settingsJSON'], function(result) {
            console.log('Value currently is ' + result.settingsJSON);
          });
        console.log(JSON.parse(localStorage.getItem("settings")))
    }
});