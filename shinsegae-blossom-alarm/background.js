// background.js

const TARGET_URL = "https://blossom.shinsegae.com/WebSite/Basic/Board/BoardList.aspx?system=Board&fdid=45044";

// 크롤링 시작 함수
function initiateCrawling() {
    chrome.tabs.create({ url: TARGET_URL }, (tab) => {
        console.log(`크롤링을 위해 새로운 탭을 열었습니다. 탭 ID: ${tab.id}`);
    });
}

// 익스텐션 설치 시 크롤링 시작
chrome.runtime.onInstalled.addListener(() => {
    console.log('Blossom 게시판 자동 크롤러 익스텐션이 설치되었습니다.');
    initiateCrawling();
});

// 메시지 리스너: content.js로부터 데이터 수신
// background.js 내 onMessage 리스너 수정
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'send_data') {
        const data = request.data;
        console.log('수신된 크롤링 데이터:', data);

        // 최신 게시물 가져오기 (예: 첫 번째 항목)
        if (data.length > 0) {
            const latestPost = data[0];
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: '새 게시물 알림',
                message: `${latestPost.promotionName} by ${latestPost.creator}`,
                priority: 2
            });
        }
    }
});