// background.js

const TARGET_URL = "https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044&autocrawl=true";
let crawlingTabIds = new Set();
let notifiedPostNumbers = new Set();

function createAlarm() {
    chrome.storage.local.get('alarmInterval', (result) => {
        const interval = result.alarmInterval || 1;
        chrome.alarms.clear('blossomAlarm', () => {
            chrome.alarms.create('blossomAlarm', { delayInMinutes: interval, periodInMinutes: interval });
            console.log(`blossomAlarm이 설정되었습니다. 간격: ${interval}분`);
        });
    });
}

// 알림 생성 함수
function notifyMissingCredentials() {
    chrome.alarms.clear('blossomAlarm', (wasCleared) => {
        if (wasCleared) {
            console.log('로그인 정보 누락으로 인해 blossomAlarm이 멈췄습니다.');
        } else {
            console.log('blossomAlarm을 멈추는 데 실패했습니다.');
        }
    });
    chrome.notifications.create('missing_credentials', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon.png'),
        title: '로그인 정보 필요',
        message: '로그인 정보가 저장되지 않았습니다. 로그인 정보를 입력해 주세요.',
        priority: 2,
        isClickable: true,
        requireInteraction: true
    }, (id) => {
        console.log(`로그인 정보 필요 알림 생성: ${id}`);
    });
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('Blossom 게시판 자동 크롤러 익스텐션이 설치되었습니다.');

    // 초기화할 키 목록 정의
    const keysToRemove = ['loginAttempted', 'notifiedPostNumbers', 'iv', 'encryptedUsername', 'encryptedPassword'];
    chrome.storage.local.remove(keysToRemove, () => {
        console.log('지정된 키들이 chrome.storage.local에서 삭제되었습니다.');
    });

    // 로그인 정보 필요 알림 생성
    notifyMissingCredentials();
});

chrome.runtime.onStartup.addListener(() => {
    console.log('브라우저가 시작되었습니다.');

    // 초기화할 키 목록 정의
    const keysToRemove = ['loginAttempted', 'notifiedPostNumbers', 'iv', 'encryptedUsername', 'encryptedPassword'];
    chrome.storage.local.remove(keysToRemove, () => {
        console.log('지정된 키들이 chrome.storage.local에서 삭제되었습니다.');
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "blossomAlarm") {
        console.log('크롤링 알람 발생. 크롤링 작업을 시작합니다.');
        tryToOpenBoardPageOrLoginPage();
    }
});

function tryToOpenBoardPageOrLoginPage() {
    chrome.storage.local.get(['iv', 'encryptedUsername', 'encryptedPassword', 'notifiedPostNumbers'], (result) => {
        const { iv, encryptedUsername, encryptedPassword, notifiedPostNumbers: storedNotified } = result;
        if (storedNotified) {
            notifiedPostNumbers = new Set(storedNotified);
        }

        if (iv && encryptedUsername && encryptedPassword) {
            console.log('저장된 암호화된 로그인 정보를 불러왔습니다.');
            chrome.tabs.create({ url: TARGET_URL, active: false }, (tab) => {
                console.log(`크롤링을 위해 게시판 페이지를 열었습니다. 탭 ID: ${tab.id}`);
                crawlingTabIds.add(tab.id);
            });
        } else {
            console.log('저장된 암호화된 로그인 정보가 없습니다. 로그인 정보가 필요합니다.');
            notifyMissingCredentials();
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start_crawling') {
        tryToOpenBoardPageOrLoginPage();
        sendResponse({ status: 'success' });
    }
    else if (request.action === 'reset_alarm') {
        createAlarm();
        sendResponse({ status: 'success' });
    }
    else if (request.action === 'send_data') {
        const data = request.data;
        console.log('수신된 크롤링 데이터:', data);

        // 저장된 제외 분류 가져오기
        chrome.storage.local.get('excludedCategories', (result) => {
            const excludedCategories = result.excludedCategories || [];
            console.log('제외할 분류:', excludedCategories);

            createAlarm(); // 데이터 수신 후 알람 설정

            if (data.length > 0) {
                let newNotifications = false;
                data.slice().reverse().forEach(post => {
                    if (!notifiedPostNumbers.has(post.number) && !excludedCategories.includes(post.category)) {
                        // 알림 생성 코드
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
                    } else {
                        console.log(`알림 제외: ${post.promotionName} (분류: ${post.category})`);
                    }
                });

                if (newNotifications) {
                    chrome.storage.local.set({ notifiedPostNumbers: Array.from(notifiedPostNumbers) }, () => {
                        console.log('알림 기록이 업데이트되어 저장되었습니다.');
                    });
                }
            }

            sendResponse({ status: 'success' });
        });
    }
    else if (request.action === 'notify_login_error') {
        chrome.notifications.create('login_error', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: '로그인 오류',
            message: '로그인 아이디 또는 패스워드가 틀렸습니다. 또는 VPN이나 회사 와이파이로 접속해야 합니다.',
            priority: 1,
            isClickable: true,
            requireInteraction: true
        }, (id) => {
            console.log(`로그인 오류 알림 생성: ${id}`);
        });
        // 알람 멈추기
        chrome.alarms.clear('blossomAlarm', (wasCleared) => {
            if (wasCleared) {
                console.log('로그인 오류로 인해 blossomAlarm이 멈췄습니다.');
            } else {
                console.log('blossomAlarm을 멈추는 데 실패했습니다.');
            }
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