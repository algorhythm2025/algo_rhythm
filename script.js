// 페이지 로드 시 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
    // // 로그인 폼 제출 이벤트 처리
    // document.getElementById('loginForm').addEventListener('submit', (e) => {
    //     e.preventDefault();
    //     const email = document.getElementById('email').value;
    //     const password = document.getElementById('password').value;
    //
    //     // 임시 로그인 처리 (실제로는 서버 인증이 필요)
    //     if (email && password) {
    //         document.getElementById('loginPage').classList.add('d-none');
    //         document.getElementById('mainPage').classList.remove('d-none');
    //         showSection('main');
    //     }
    // });

    const imageInput = document.getElementById('imageInput');
    const imageUploadContainer = document.querySelector('.image-upload-container');
    const imagePreview = document.getElementById('imagePreview');

    // 파일 선택 시
    imageInput.addEventListener('change', handleImageSelect);

    // 드래그 앤 드롭 이벤트
    imageUploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadContainer.classList.add('dragover');
    });

    imageUploadContainer.addEventListener('dragleave', () => {
        imageUploadContainer.classList.remove('dragover');
    });

    imageUploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadContainer.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });
});

// 구글 로그인 시뮬레이션
function simulateGoogleLogin() {
    document.getElementById('loginPage').classList.add('d-none');
    document.getElementById('mainPage').classList.remove('d-none');
    showSection('main');
}

// 섹션 표시 함수
function showSection(sectionName) {
    // 모든 섹션 숨기기
    const sections = ['mainSection', 'driveSection', 'portalSection', 'pptMakerSection', 'myPageSection'];
    sections.forEach(section => {
        document.getElementById(section).classList.add('d-none');
    });
    
    // 선택한 섹션 표시
    document.getElementById(sectionName + 'Section').classList.remove('d-none');
    
    // 사이드바 활성 항목 변경
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.sidebar-item[onclick="showSection('${sectionName}')"]`).classList.add('active');
}

// 이력 추가 모달 표시
function showAddExperienceModal() {
    const modal = new bootstrap.Modal(document.getElementById('addExperienceModal'));
    modal.show();
}

// 이력 저장
function saveExperience() {
    const form = document.getElementById('experienceForm');
    const title = form.querySelector('input[type="text"]').value;
    const period = form.querySelector('input[placeholder*="기간"]').value;
    const description = form.querySelector('textarea').value;
    const imagePreview = document.getElementById('imagePreview');
    const hasImage = !imagePreview.classList.contains('d-none');
    const imageSrc = hasImage ? imagePreview.querySelector('img').src : '';
    
    if (title && period && description) {
        // 빈 상태 메시지 제거
        const emptyStateList = document.querySelectorAll('.empty-state');
        emptyStateList.forEach(emptyState => {
            if (emptyState.closest('#experienceList') || emptyState.closest('#experienceManagement')) {
                emptyState.remove();
            }
        });
        
        // 이력 목록에 추가
        const experienceList = document.getElementById('experienceList');
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex align-items-center">
                ${hasImage ? `<div class="me-3" style="width: 60px; height: 60px; overflow: hidden; border-radius: 4px;">
                    <img src="${imageSrc}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>` : ''}
                <div class="flex-grow-1">
                    <h6 class="mb-1">${title}</h6>
                    <p class="mb-1"><small>${period}</small></p>
                    <p class="mb-0">${description}</p>
                </div>
                <div class="form-check ms-3">
                    <input class="form-check-input" type="checkbox" onchange="updateNextButton()">
                </div>
            </div>
        `;
        experienceList.appendChild(item);
        
        // 이력 관리 목록에도 추가
        const managementList = document.getElementById('experienceManagement');
        const managementItem = document.createElement('div');
        managementItem.className = 'list-group-item';
        managementItem.innerHTML = `
            <div class="d-flex align-items-center">
                ${hasImage ? `<div class="me-3" style="width: 50px; height: 50px; overflow: hidden; border-radius: 4px;">
                    <img src="${imageSrc}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>` : ''}
                <div class="flex-grow-1">
                    <h6 class="mb-1">${title}</h6>
                    <p class="mb-0"><small>${period}</small></p>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-dark me-2" onclick="editExperience(this)">수정</button>
                    <button class="btn btn-sm btn-outline-dark" onclick="deleteExperience(this)">삭제</button>
                </div>
            </div>
        `;
        managementList.appendChild(managementItem);
        
        // 모달 닫기 및 폼 초기화
        bootstrap.Modal.getInstance(document.getElementById('addExperienceModal')).hide();
        form.reset();
        removeImage();
    }
}

// 전체 선택/해제
function selectAllExperiences(select) {
    const checkboxes = document.querySelectorAll('#experienceList .form-check-input');
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
    });
    updateNextButton();
}

// 다음 버튼 상태 업데이트
function updateNextButton() {
    const checkboxes = document.querySelectorAll('#experienceList .form-check-input');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const nextButton = document.getElementById('nextButton');
    nextButton.disabled = checkedCount === 0;
}

// 템플릿 선택 화면 표시
function showTemplateSelection() {
    // 선택된 이력 저장
    const selectedExperiences = [];
    const checkboxes = document.querySelectorAll('#experienceList .form-check-input:checked');
    checkboxes.forEach(checkbox => {
        const item = checkbox.closest('.list-group-item');
        selectedExperiences.push({
            title: item.querySelector('h6').textContent,
            period: item.querySelector('small').textContent,
            description: item.querySelector('p:last-child').textContent
        });
    });

    // 템플릿 선택 화면 표시
    document.querySelector('#pptMakerSection .mac-window').classList.add('d-none');
    const templateSelection = document.getElementById('templateSelection');
    templateSelection.classList.remove('d-none');

    // 템플릿 옵션 추가
    const templateGrid = templateSelection.querySelector('.template-grid');
    templateGrid.innerHTML = `
        <div class="mac-card">
            <i class="fas fa-th-large"></i>
            <h3>기본 템플릿</h3>
            <p>깔끔하고 전문적인 디자인</p>
        </div>
        <div class="mac-card">
            <i class="fas fa-stream"></i>
            <h3>타임라인 템플릿</h3>
            <p>시간순으로 보기 좋은 구성</p>
        </div>
        <div class="mac-card">
            <i class="fas fa-th"></i>
            <h3>그리드 템플릿</h3>
            <p>격자형 레이아웃 디자인</p>
        </div>
    `;
}

// PPT 미리보기
function previewPPT() {
    const selectedExperiences = document.querySelectorAll('#experienceList input[type="checkbox"]:checked');
    if (selectedExperiences.length === 0) {
        alert('포트폴리오에 포함할 이력을 선택해주세요.');
        return;
    }
    alert('PPT 미리보기 기능은 현재 구현 중입니다.');
}

// 로그아웃
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        document.getElementById('mainPage').classList.add('d-none');
        document.getElementById('loginPage').classList.remove('d-none');
    }
}

// 이력 수정
function editExperience(button) {
    const item = button.closest('.list-group-item');
    const title = item.querySelector('h6').textContent;
    const period = item.querySelector('small').textContent;
    
    // 수정 기능 구현 예정
    alert('이력 수정 기능은 현재 구현 중입니다.');
}

// 이력 삭제
function deleteExperience(button) {
    if (confirm('이 이력을 삭제하시겠습니까?')) {
        const item = button.closest('.list-group-item');
        item.remove();
    }
}

// 이미지 파일 선택 처리
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

// 이미지 파일 처리
function handleImageFile(file) {
    if (file.size > 5 * 1024 * 1024) { // 5MB 제한
        alert('파일 크기가 5MB를 초과할 수 없습니다.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imagePreview = document.getElementById('imagePreview');
        const img = imagePreview.querySelector('img');
        img.src = e.target.result;
        imagePreview.classList.remove('d-none');
    };
    reader.readAsDataURL(file);
}

// 이미지 제거
function removeImage() {
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    imageInput.value = '';
    imagePreview.classList.add('d-none');
    imagePreview.querySelector('img').src = '';
} 