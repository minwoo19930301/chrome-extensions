chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("blossomAlarm", { delayInMinutes: 1, periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "blossomAlarm") {
        chrome.notifications.create("", {
            type: "basic",
            title: "Shinsegae Blossom",
            message: "새로운 알림이 있습니다!",
            iconUrl: chrome.runtime.getURL("icon.png") // 로컬 아이콘 파일 경로
        }, (notificationId) => {
            console.log("Notification created with ID:", notificationId);
        });
    }
});