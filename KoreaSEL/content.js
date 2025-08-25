// Korea keywords and patterns
const KOREA_KEYWORDS = new Set([
    // 한글
    '대한민국', '한국', '남한', '코리아', '서울', 'daehanminguk',
    // 영문
    'south korea', 'korea', 'republic of korea', 'rok', 'kr', 'kor',
    'korea, republic of', 'korea (south)', 'korea, south', 's. korea',
    'so. korea', 'south korean', 'k-country', 'k.r', 'rep. of korea',
    'south of korea', 'korea (s)', 'the land of the morning calm',
    // ISO 코드 및 기타
    '410', '+82',
    // 다른 언어
    '韓国', '韩国', 'corée du sud', 'südkorea', 'corea del sur',
    'coreia do sul', 'zuid-korea', 'южная корея', 'كوريا الجنوبية',
    'republik korea', 'république de corée', 'república de corea',
    'repubblica di corea', 'corea', 'coreia', '大韓民國', '大韩民国', '大韓民国',
    'đại hàn dân quốc', 'kr-', 'kr-kr'
].map(k => k.toLowerCase()));

const KOREA_PATTERNS = [
  /\b(South\s*Korea|Korea\s*Republic|Republic\s*of\s*Korea)\b/i,
  /\b(대한민국|한국)\b/,
  /\bKR\b/i, // KR은 단독으로도 많이 쓰여서 대소문자 무시
  /\bKOR\b/i,
  /\+82\b/
];

let autoSelectEnabled = false;
let processedElements = new WeakSet(); // DOM 요소를 직접 키로 사용
let mutationObserver = null;

// 초기화 및 설정 상태 확인
chrome.storage.local.get(['koreaSelectorEnabled'], function(result) {
    autoSelectEnabled = result.koreaSelectorEnabled !== false; // 기본값을 true로
    if (autoSelectEnabled) {
        initAutoSelector();
    }
});

// 메시지 리스너
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'toggleAutoSelect') {
        autoSelectEnabled = request.enabled;
        
        if (autoSelectEnabled) {
            initAutoSelector();
            sendResponse({ success: true, message: '자동 선택이 활성화되었습니다' });
        } else {
            if (mutationObserver) {
                mutationObserver.disconnect();
                mutationObserver = null;
            }
            processedElements = new WeakSet();
            sendResponse({ success: true, message: '자동 선택이 비활성화되었습니다' });
        }
    }
    return true;
});

function initAutoSelector() {
    if (!autoSelectEnabled) return;
    if (mutationObserver) mutationObserver.disconnect();
    
    // 페이지의 모든 잠재적 국가 선택 요소를 처리
    processAllPotentialSelectors();
    
    // MutationObserver 설정
    mutationObserver = new MutationObserver((mutations) => {
        if (!autoSelectEnabled) return;
        
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // 새로 추가된 노드와 그 자식 노드들을 검사
                    findAndProcessSelectors(node);
                }
            }
        }
    });
    
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function processAllPotentialSelectors() {
    console.log('[KoreaSEL] Initial processing of all potential selectors.');
    findAndProcessSelectors(document.body);
}

function findAndProcessSelectors(rootElement) {
    // 1. 네이티브 <select> 처리
    const selects = rootElement.querySelectorAll('select');
    selects.forEach(processSelect);
    
    // 2. 커스텀 드롭다운 처리 (ARIA 속성 기반)
    const customDropdowns = rootElement.querySelectorAll('[role="combobox"], [aria-haspopup="listbox"], .country-select'); // 클래스명 예시 추가
    customDropdowns.forEach(processCustomDropdown);
}


function isLikelyCountrySelector(element) {
    const attributes = [
        element.id,
        element.name,
        element.className,
        element.getAttribute('placeholder'),
        element.getAttribute('aria-label')
    ].join(' ').toLowerCase();

    // 연결된 라벨 텍스트 가져오기
    let labelText = '';
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label) {
            labelText = label.textContent.toLowerCase();
        }
    }
    const fullText = attributes + ' ' + labelText;

    const countryIndicators = ['country', 'nation', 'nationality', 'location', 'region', '국가', '나라', '지역'];
    
    if (countryIndicators.some(indicator => fullText.includes(indicator))) {
        return true;
    }

    // 옵션 샘플링 (select 요소에만 해당)
    if (element.tagName === 'SELECT' && element.options.length > 10) {
        const sampleOptions = Array.from(element.options).slice(1, 10).map(o => o.textContent.toLowerCase()).join(' ');
        const sampleCountries = ['united states', 'japan', 'china', 'canada'];
        if (sampleCountries.some(country => sampleOptions.includes(country))) {
            return true;
        }
    }
    
    return false;
}

function isKoreaMatch(text) {
    const normalizedText = text.toLowerCase().trim();
    if (KOREA_KEYWORDS.has(normalizedText)) {
        return true;
    }
    for (const keyword of KOREA_KEYWORDS) {
       if (normalizedText.includes(keyword)) return true;
    }
    for (const pattern of KOREA_PATTERNS) {
        if (pattern.test(text)) {
            return true;
        }
    }
    return false;
}

// --- 네이티브 <select> 처리 ---
function processSelect(selectElement) {
    if (!autoSelectEnabled || processedElements.has(selectElement)) return;
    
    if (isLikelyCountrySelector(selectElement)) {
        console.groupCollapsed(`[KoreaSEL] Processing <select>: ${selectElement.id || selectElement.name || 'No ID/Name'}`);
        processedElements.add(selectElement);
        
        const koreaOption = Array.from(selectElement.options).find(option => 
            isKoreaMatch(option.textContent) || isKoreaMatch(option.value)
        );

        if (koreaOption && !koreaOption.selected) {
            console.log('Found Korea option:', koreaOption.textContent);
            selectKoreaOption(selectElement, koreaOption);
        } else {
            console.log('Korea option not found or already selected.');
        }
        console.groupEnd();
    }
}

function selectKoreaOption(selectElement, koreaOption) {
    try {
        selectElement.value = koreaOption.value;
        koreaOption.selected = true; // 일부 사이트에서는 이것도 필요
        
        // 다양한 이벤트를 순차적으로 발생시켜 호환성 확보
        ['change', 'input', 'blur'].forEach(eventType => {
            selectElement.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        updateStats();
        console.log('Successfully selected:', koreaOption.textContent);
    } catch (error) {
        console.error('Error selecting Korea option in <select>:', error);
    }
}


// --- 커스텀 드롭다운 처리 ---
function processCustomDropdown(triggerElement) {
    if (!autoSelectEnabled || processedElements.has(triggerElement)) return;
    
    // 이미 열려있는 메뉴나, 관련 없는 요소를 필터링
    if (triggerElement.getAttribute('aria-expanded') === 'true') return;
    if (triggerElement.tagName === 'SELECT') return; // select는 위에서 처리

    if (isLikelyCountrySelector(triggerElement)) {
        console.groupCollapsed(`[KoreaSEL] Processing Custom Dropdown Trigger:`, triggerElement);
        processedElements.add(triggerElement);
        
        // 1. 드롭다운 메뉴를 연다
        triggerElement.click();

        // 2. 메뉴가 나타날 시간을 준 뒤, 한국 옵션을 찾아서 클릭한다
        setTimeout(() => {
            // 옵션들을 포함할 가능성이 있는 컨테이너를 찾는다 (보통 body 직속 자식)
            const listboxes = document.querySelectorAll('[role="listbox"]');
            let found = false;

            listboxes.forEach(box => {
                const options = box.querySelectorAll('[role="option"], li, a, div');
                const koreaOptionElement = Array.from(options).find(opt => isKoreaMatch(opt.textContent));

                if (koreaOptionElement) {
                    console.log('Found Korea option in custom dropdown:', koreaOptionElement.textContent);
                    koreaOptionElement.click();
                    updateStats();
                    found = true;
                    // 메뉴가 닫히도록 트리거를 다시 클릭하거나 body를 클릭할 수도 있음
                    // triggerElement.click(); 
                }
            });

            if (!found) {
                console.log('Korea option not found in opened custom dropdown.');
                // 메뉴를 닫기 위해 다시 클릭 (필요 시)
                triggerElement.click();
            }
        }, 500); // 0.5초 대기. 사이트에 따라 조절 필요
        console.groupEnd();
    }
}

function updateStats() {
    chrome.storage.local.get(['koreaSelectorStats'], function(result) {
        const stats = result.koreaSelectorStats || { totalSelections: 0 };
        stats.totalSelections++;
        stats.lastSelection = {
            url: window.location.href,
            timestamp: Date.now()
        };
        chrome.storage.local.set({ koreaSelectorStats: stats });
    });
}