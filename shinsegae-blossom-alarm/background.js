// background.js

const TARGET_URL = "https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044";

// 알람 생성 함수
function createAlarm() {
    chrome.alarms.create('blossomAlarm', { delayInMinutes: 1, periodInMinutes: 1 });
    console.log('blossomAlarm이 설정되었습니다.');
}

// 익스텐션 설치 시 팝업 열기 및 알람 설정
chrome.runtime.onInstalled.addListener(() => {
    console.log('Blossom 게시판 자동 크롤러 익스텐션이 설치되었습니다.');

    // 팝업을 새 탭으로 열기
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html"), active: true }, (tab) => {
        console.log(`팝업을 열기 위해 새로운 탭을 열었습니다. 탭 ID: ${tab.id}`);
    });

    // 알람 설정
    createAlarm();
});

// 브라우저가 시작될 때 알람 설정
chrome.runtime.onStartup.addListener(() => {
    console.log('브라우저가 시작되었습니다.');
    createAlarm();
});

// 알람 리스너: 주기적으로 크롤링 작업 수행
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "blossomAlarm") {
        console.log('크롤링 알람 발생. 크롤링 작업을 시작합니다.');
        performCrawling();
    }
});

// 크롤링 수행 함수
function performCrawling() {
    // chrome.storage.local에서 암호화된 로그인 정보 불러오기
    chrome.storage.local.get(['iv', 'encryptedUsername', 'encryptedPassword'], (result) => {
        const { iv, encryptedUsername, encryptedPassword } = result;

        if (iv && encryptedUsername && encryptedPassword) {
            console.log('저장된 암호화된 로그인 정보를 불러왔습니다.');

            // 암호화된 데이터와 IV를 URL에 포함하여 로그인 페이지 열기
            const LOGIN_URL = `https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044&iv=${encodeURIComponent(iv)}&blossom_username=${encodeURIComponent(encryptedUsername)}&blossom_password=${encodeURIComponent(encryptedPassword)}`;

            // 로그인 페이지 열기 (비활성 탭으로 열기)
            chrome.tabs.create({ url: LOGIN_URL, active: false }, (tab) => {
                console.log(`크롤링을 위해 로그인 페이지를 열었습니다. 탭 ID: ${tab.id}`);

                // 페이지 로드 후 일정 시간 후에 탭 닫기
                setTimeout(() => {
                    chrome.tabs.remove(tab.id, () => {
                        console.log(`크롤링을 위한 탭을 닫았습니다. 탭 ID: ${tab.id}`);
                    });
                }, 10000); // 10초 후 탭 닫기 (필요에 따라 조정)
            });
        } else {
            console.log('저장된 암호화된 로그인 정보가 없습니다. 팝업을 열어 로그인 정보를 입력하세요.');
            // 로그인 정보가 없을 경우, 팝업 열기
            chrome.tabs.create({ url: chrome.runtime.getURL("popup.html"), active: true }, () => {
                console.log('로그인 정보 입력을 위해 팝업을 열었습니다.');
            });
        }
    });
}

// 메시지 리스너: content.js로부터 데이터 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'start_crawling') {
        performCrawling();
        sendResponse({ status: 'success' });
    }
    else if (request.action === 'send_data') {
        const data = request.data;
        console.log('수신된 크롤링 데이터:', data);

        if (data.length > 0) {
            const latestPost = data[0];
            chrome.notifications.create(`post_${latestPost.number}`, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icon.png'),
                title: latestPost.promotionName,
                message: `${latestPost.category} (${latestPost.productGroup}) ${latestPost.postDate}`,
                priority: 2,
                isClickable: true
            }, (notificationId) => {
                console.log(`알림 생성: ${latestPost.promotionName} (ID: ${notificationId})`);
            });
        }

        sendResponse({ status: 'success' });
    }
    else if (request.action === 'notify_login_error') {
        // 로그인 오류 알림 생성
        chrome.notifications.create('login_error', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: '로그인 오류',
            message: '로그인 정보가 유효하지 않습니다. 로그인 정보를 재입력해 주세요.',
            priority: 2,
            isClickable: true
        }, (id) => {
            console.log(`로그인 오류 알림 생성: ${id}`);
        });
        sendResponse({ status: 'success' });
    }
    else if (request.action === 'notify_missing_credentials') {
        // 로그인 정보 누락 알림 생성
        chrome.notifications.create('missing_credentials', {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: '로그인 정보 필요',
            message: '로그인 정보가 저장되지 않았습니다. 로그인 정보를 입력해 주세요.',
            priority: 2,
            isClickable: true
        }, (id) => {
            console.log(`로그인 정보 누락 알림 생성: ${id}`);
        });
        sendResponse({ status: 'success' });
    }
});

// 알림 클릭 시 동작 설정
chrome.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith('post_')) {
        // 게시물 알림 클릭 시 게시판 리스트 페이지로 이동
        chrome.tabs.create({ url: TARGET_URL }, () => {
            console.log(`알림 클릭: 게시판 리스트 페이지로 이동 (${TARGET_URL})`);
        });
    } else if (notificationId === 'missing_credentials' || notificationId === 'login_error') {
        // 로그인 정보 누락 또는 로그인 오류 알림 클릭 시 팝업 열기
        chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") }, () => {
            console.log('로그인 정보 수정 팝업 열기.');
        });
    }

    // 알림 닫기
    chrome.notifications.clear(notificationId);
});