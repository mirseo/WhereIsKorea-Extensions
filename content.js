// Korea keywords and patterns
const KOREA_KEYWORDS = [
  // 한글 표기
  '대한민국',
  '한국',
  '남한',
  '코리아',
  
  // 영문 표기
  'South Korea',
  'Korea',
  'Republic of Korea',
  'ROK',
  'KR',
  'KOR',
  'KOREA',
  'Korea, Republic of',
  'Korea (South)',
  'Korea, South',
  'S. Korea',
  'So. Korea',
  'South Korean',
  
  // ISO 코드
  '410',
  '+82',
  
  // 기타 언어
  '韓国', // 일본어
  '韩国', // 중국어 간체
  'Corée du Sud', // 프랑스어
  'Südkorea', // 독일어
  'Corea del Sur', // 스페인어
  'Coreia do Sul', // 포르투갈어
  'Zuid-Korea', // 네덜란드어
  'Южная Корея', // 러시아어
  'كوريا الجنوبية', // 아랍어
  
  // 도시명
  'Seoul',
  '서울',
  'Busan',
  '부산',
  'Incheon',
  '인천',
  'Daegu',
  '대구',
  'Daejeon',
  '대전',
  'Gwangju',
  '광주',
  'Ulsan',
  '울산'
];

const KOREA_PATTERNS = [
  /\b(South\s*Korea|Korea\s*Republic|Republic\s*of\s*Korea)\b/i,
  /\b(대한민국|한국)\b/,
  /\bKR\b/,
  /\bKOR\b/,
  /\+82\b/
];

let autoSelectEnabled = false;
let processedSelects = new Set();

// 초기화 및 설정 상태 확인
chrome.storage.local.get(['koreaSelectorEnabled'], function(result) {
    autoSelectEnabled = result.koreaSelectorEnabled || false;
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
            sendResponse({
                success: true,
                message: '자동 선택이 활성화되었습니다'
            });
        } else {
            sendResponse({
                success: true,
                message: '자동 선택이 비활성화되었습니다'
            });
        }
    }
    return true;
});

function initAutoSelector() {
    if (!autoSelectEnabled) return;
    
    // 기존 select 요소들 처리
    processExistingSelects();
    
    // 새로 생성되는 select 요소들을 위한 MutationObserver
    const observer = new MutationObserver(function(mutations) {
        if (!autoSelectEnabled) return;
        
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // 새로 추가된 select 요소 처리
                    const selects = node.querySelectorAll ? node.querySelectorAll('select') : [];
                    selects.forEach(processSelect);
                    
                    // 추가된 노드가 select인 경우
                    if (node.tagName === 'SELECT') {
                        processSelect(node);
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function processExistingSelects() {
    const selects = document.querySelectorAll('select');
    selects.forEach(processSelect);
}

function processSelect(selectElement) {
    if (processedSelects.has(selectElement)) return;
    processedSelects.add(selectElement);
    
    // 국가 선택과 관련된 select인지 확인
    if (!isCountrySelect(selectElement)) return;
    
    // 한국 옵션 찾기 및 선택
    const koreaOption = findKoreaOption(selectElement);
    if (koreaOption) {
        // 이미 선택된 경우 skip
        if (selectElement.value === koreaOption.value || koreaOption.selected) return;
        
        // 한국 자동 선택
        selectKoreaOption(selectElement, koreaOption);
    }
}

function isCountrySelect(selectElement) {
    const attributes = [
        selectElement.name,
        selectElement.id,
        selectElement.className,
        selectElement.getAttribute('placeholder')
    ].join(' ').toLowerCase();
    
    const countryIndicators = [
        'country', 'nation', 'nationality', 'location', 'region',
        '국가', '나라', '지역'
    ];
    
    return countryIndicators.some(indicator => attributes.includes(indicator));
}

function findKoreaOption(selectElement) {
    const options = Array.from(selectElement.options);
    
    for (const option of options) {
        const optionText = option.textContent.trim();
        const optionValue = option.value.toLowerCase();
        
        // 정확한 매칭 우선
        if (isKoreaMatch(optionText) || isKoreaMatch(optionValue)) {
            return option;
        }
    }
    
    return null;
}

function isKoreaMatch(text) {
    const normalizedText = text.toLowerCase().trim();
    
    // 정확한 키워드 매칭
    for (const keyword of KOREA_KEYWORDS) {
        if (normalizedText === keyword.toLowerCase() || 
            normalizedText.includes(keyword.toLowerCase())) {
            return true;
        }
    }
    
    // 패턴 매칭
    for (const pattern of KOREA_PATTERNS) {
        if (pattern.test(text)) {
            return true;
        }
    }
    
    return false;
}

function selectKoreaOption(selectElement, koreaOption) {
    try {
        // 이벤트 발생 전 상태 저장
        const previousValue = selectElement.value;
        
        // 옵션 선택
        koreaOption.selected = true;
        selectElement.value = koreaOption.value;
        
        // change 이벤트 발생
        const changeEvent = new Event('change', { bubbles: true });
        selectElement.dispatchEvent(changeEvent);
        
        // input 이벤트도 발생 (일부 사이트에서 필요)
        const inputEvent = new Event('input', { bubbles: true });
        selectElement.dispatchEvent(inputEvent);
        
        // 통계 업데이트
        updateStats();
        
        console.log('Korea automatically selected:', koreaOption.textContent);
        
    } catch (error) {
        console.error('Error selecting Korea option:', error);
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