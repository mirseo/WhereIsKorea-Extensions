document.addEventListener('DOMContentLoaded', async () => {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const statusText = document.getElementById('statusText');
    const copyrightLink = document.getElementById('copyrightLink');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeDropdown = document.getElementById('themeDropdown');
    const themeOptions = document.querySelectorAll('.theme-option');

    // 저장된 상태 불러오기 (Modern Promise-based API)
    const result = await chrome.storage.local.get(['koreaSelectorEnabled', 'theme']);
    const isEnabled = result.koreaSelectorEnabled !== false;
    const savedTheme = result.theme || 'light';

    toggleSwitch.checked = isEnabled;
    updateStatusText(isEnabled);
    applyTheme(savedTheme);

    // 토글 스위치 이벤트 리스너
    toggleSwitch.addEventListener('change', async () => {
        const isEnabled = toggleSwitch.checked;

        // 상태 저장
        await chrome.storage.local.set({
            koreaSelectorEnabled: isEnabled
        });

        // UI 업데이트
        updateStatusText(isEnabled);

        // 컨텐츠 스크립트에 상태 전달
        try {
            const tabs = await chrome.tabs.query({active: true, currentWindow: true});
            if (tabs[0]) {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggleAutoSelect',
                    enabled: isEnabled
                });
            }
        } catch (error) {
            console.log('Could not send message to content script:', error);
        }
    });

    // Copyright 링크 클릭 이벤트
    copyrightLink.addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://github.com/mirseo/WhereIsKorea-Extensions' });
    });

    // 테마 토글 버튼 클릭
    themeToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('active');
    });

    // 테마 옵션 선택
    themeOptions.forEach(option => {
        option.addEventListener('click', async () => {
            const theme = option.getAttribute('data-theme');
            await chrome.storage.local.set({ theme });
            applyTheme(theme);
            themeDropdown.classList.remove('active');
        });
    });

    // 드롭다운 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (!themeToggleBtn.contains(e.target) && !themeDropdown.contains(e.target)) {
            themeDropdown.classList.remove('active');
        }
    });

    function updateStatusText(isEnabled) {
        statusText.textContent = isEnabled ? 'Enabled' : 'Disabled';
        statusText.className = `status ${isEnabled ? 'enabled' : 'disabled'}`;
    }

    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }

        // 활성 테마 옵션 표시
        themeOptions.forEach(option => {
            if (option.getAttribute('data-theme') === theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    }
});