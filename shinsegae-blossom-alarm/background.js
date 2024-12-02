// background.js


// 익스텐션 설치 시 팝업 열기
chrome.runtime.onInstalled.addListener(() => {
    console.log('Blossom 게시판 자동 크롤러 익스텐션이 설치되었습니다.');
    // 팝업을 새 탭으로 열기
    chrome.tabs.create({ url: chrome.runtime.getURL("popup.html"), active: true }, (tab) => {
        console.log(`팝업을 열기 위해 새로운 탭을 열었습니다. 탭 ID: ${tab.id}`);
    });
});

// 메시지 리스너: content.js로부터 데이터 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'send_data') {
        const data = request.data;
        console.log('수신된 크롤링 데이터:', data);

        if (data.length > 0) {
            const latestPost = data[0];
            chrome.notifications.create(`post_${latestPost.number}`, {
                type: 'basic',
                iconUrl: 'icon.png',
                title: latestPost.promotionName,
                message: `${latestPost.category} (${latestPost.productGroup}) ${latestPost.postDate}`,
                priority: 2,
                isClickable: true
            });
            console.log(`알림 생성: ${latestPost.promotionName}`);
        }

        sendResponse({ status: 'success' });
    }
    else if (request.action === 'notify_login_error') {
        // 로그인 오류 알림 생성
        chrome.notifications.create('login_error', {
            type: 'basic',
            iconUrl: 'icon.png',
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
            iconUrl: 'icon.png',
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