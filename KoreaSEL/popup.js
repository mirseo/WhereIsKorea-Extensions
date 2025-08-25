document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const statusText = document.getElementById('statusText');
    const copyrightLink = document.getElementById('copyrightLink');

    // 저장된 상태 불러오기
    chrome.storage.local.get(['koreaSelectorEnabled'], function(result) {
        const isEnabled = result.koreaSelectorEnabled || false;
        toggleSwitch.checked = isEnabled;
        updateStatusText(isEnabled);
    });

    // 토글 스위치 이벤트 리스너
    toggleSwitch.addEventListener('change', function() {
        const isEnabled = toggleSwitch.checked;
        
        // 상태 저장
        chrome.storage.local.set({
            koreaSelectorEnabled: isEnabled
        });

        // UI 업데이트
        updateStatusText(isEnabled);
        
        // 컨텐츠 스크립트에 상태 전달
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleAutoSelect',
                    enabled: isEnabled
                });
            }
        });
    });

    // Copyright 링크 클릭 이벤트
    copyrightLink.addEventListener('click', function() {
        chrome.tabs.create({ url: 'https://github.com/mirseo/WhereIsKorea-Extensions' });
    });

    function updateStatusText(isEnabled) {
        statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
        statusText.className = `status ${isEnabled ? 'enabled' : 'disabled'}`;
    }
});