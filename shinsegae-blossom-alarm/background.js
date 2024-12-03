const TARGET_URL = "https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044&autocrawl=true";
let crawlingTabIds = new Set();
let notifiedPostNumbers = new Set();

function createAlarm() {
    chrome.alarms.create('blossomAlarm', { delayInMinutes: 1, periodInMinutes: 1 });
    console.log('blossomAlarm이 설정되었습니다.');
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('Blossom 게시판 자동 크롤러 익스텐션이 설치되었습니다.');
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html"), active: true }, (tab) => {
        console.log(`팝업을 열기 위해 새로운 탭을 열었습니다. 탭 ID: ${tab.id}`);
    });
    createAlarm();
});

chrome.runtime.onStartup.addListener(() => {
    console.log('브라우저가 시작되었습니다.');
    createAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "blossomAlarm") {
        console.log('크롤링 알람 발생. 크롤링 작업을 시작합니다.');
        performCrawling();
    }
});

function performCrawling() {
    chrome.storage.local.get(['iv', 'encryptedUsername', 'encryptedPassword', 'notifiedPostNumbers'], (result) => {
        const { iv, encryptedUsername, encryptedPassword, notifiedPostNumbers: storedNotified } = result;
        if (storedNotified) {
            notifiedPostNumbers = new Set(storedNotified);
        }

        if (iv && encryptedUsername && encryptedPassword) {
            console.log('저장된 암호화된 로그인 정보를 불러왔습니다.');
            chrome.tabs.create({ url: TARGET_URL, active: false }, (tab) => {
                console.log(`크롤링을 위해 로그인 페이지를 열었습니다. 탭 ID: ${tab.id}`);
                crawlingTabIds.add(tab.id);
            });
        } else {
            console.log('저장된 암호화된 로그인 정보가 없습니다. 팝업을 열어 로그인 정보를 입력하세요.');
            chrome.tabs.create({ url: chrome.runtime.getURL("popup.html"), active: true }, () => {
                console.log('로그인 정보 입력을 위해 팝업을 열었습니다.');
            });
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start_crawling') {
        performCrawling();
        sendResponse({ status: 'success' });
    }
    else if (request.action === 'send_data') {
        const data = request.data;
        console.log('수신된 크롤링 데이터:', data);

        if (data.length > 0) {
            let newNotifications = false;
            data.forEach(post => {
                if (!notifiedPostNumbers.has(post.number)) {
                    chrome.notifications.create(`post_${post.number}`, {
                        type: 'basic',
                        iconUrl: chrome.runtime.getURL('icon.png'),
                        title: post.promotionName,
                        message: `${post.category} (${post.productGroup}) ${post.postDate}`,
                        priority: 2,
                        isClickable: true,
                        requireInteraction: true
                    }, (notificationId) => {
                        console.log(`알림 생성: ${post.promotionName} (ID: ${notificationId})`);
                    });
                    notifiedPostNumbers.add(post.number);
                    newNotifications = true;
                }
            });

            if (newNotifications) {
                chrome.storage.local.set({ notifiedPostNumbers: Array.from(notifiedPostNumbers) }, () => {
                    console.log('알림 기록이 업데이트되어 저장되었습니다.');
                });
            }
        }

        sendResponse({ status: 'success' });
    }
    else if (request.action === 'notify_login_error') {
        chrome.notifications.create('login_error', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: '로그인 오류',
            message: '로그인 정보가 유효하지 않습니다. 로그인 정보를 재입력해 주세요.',
            priority: 2,
            isClickable: true,
            requireInteraction: true
        }, (id) => {
            console.log(`로그인 오류 알림 생성: ${id}`);
        });
        sendResponse({ status: 'success' });
    }
    else if (request.action === 'notify_missing_credentials') {
        chrome.notifications.create('missing_credentials', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: '로그인 정보 필요',
            message: '로그인 정보가 저장되지 않았습니다. 로그인 정보를 입력해 주세요.',
            priority: 2,
            isClickable: true,
            requireInteraction: true
        }, (id) => {
            console.log(`로그인 정보 누락 알림 생성: ${id}`);
        });
        sendResponse({ status: 'success' });
    }
    else if (request.action === 'content_finished') {
        if (sender.tab && sender.tab.id) {
            if (crawlingTabIds.has(sender.tab.id)) {
                chrome.tabs.remove(sender.tab.id, () => {
                    console.log(`크롤링 탭을 닫았습니다. 탭 ID: ${sender.tab.id}`);
                    crawlingTabIds.delete(sender.tab.id);
                });
            }
        }
        sendResponse({ status: 'success' });
    }
});

chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith('post_')) {
        chrome.tabs.create({ url: TARGET_URL }, () => {
            console.log(`알림 클릭: 게시판 리스트 페이지로 이동 (${TARGET_URL})`);
        });
    } else if (notificationId === 'missing_credentials' || notificationId === 'login_error') {
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") }, () => {
            console.log('로그인 정보 수정 팝업 열기.');
        });
    }
    chrome.notifications.clear(notificationId);
});