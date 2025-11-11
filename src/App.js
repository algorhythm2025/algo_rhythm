import React, { useState, useRef, useEffect } from 'react';
import { useAppLogic } from './appLogic';
import TopNav from './TopNav';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import './unified-styles.css';

/* 상단 네비게이션 아이템 */
export const NAV_ITEMS = [
    { id: "main", label: "메인",          icon: "fas fa-home" },
    { id: "drive", label: "구글 드라이브", icon: "fab fa-google-drive" },
    { id: "portal", label: "학교 포털",     icon: "fas fa-university" },
    { id: "pptMaker", label: "PPT 제작",    icon: "fas fa-file-powerpoint" },
    { id: "myPage", label: "마이페이지",    icon: "fas fa-user" },
];

/** Apple TV+ 스타일 캐러셀 (순수 React) */
function HeroCarousel({ onSelect }) {
    const slides = [
        {
            key: "pptMaker",
            eyebrow: "Make",
            title: "포트폴리오 PPT 제작",
            subtitle: "템플릿으로 빠르게, 더 세련되게",
            bg: "linear-gradient(135deg,#0F1115 0%, #171B22 50%, #0E0F13 100%)",
            accent: "linear-gradient(90deg,#e2e2e2, #f5f5f5)",
        },
        {
            key: "drive",
            eyebrow: "Sync",
            title: "구글 드라이브 연동",
            subtitle: "파일 업로드부터 공유까지 한 번에",
            bg: "linear-gradient(135deg,#0F1115 0%, #151922 55%, #0E0F13 100%)",
            accent: "linear-gradient(90deg,#d9e2ff, #eff3ff)",
        },
        {
            key: "portal",
            eyebrow: "Campus",
            title: "학교 포털 바로가기",
            subtitle: "학사 일정과 공지 확인",
            bg: "linear-gradient(135deg,#0F1115 0%, #161b21 50%, #0F1218 100%)",
            accent: "linear-gradient(90deg,#e9e9e9,#f7f7f7)",
        },
        {
            key: "myPage",
            eyebrow: "Profile",
            title: "마이페이지",
            subtitle: "내 기록과 제작 이력 한눈에",
            bg: "linear-gradient(135deg,#0F1115 0%, #171B22 55%, #0E0F13 100%)",
            accent: "linear-gradient(90deg,#e2e2e2, #f5f5f5)",
        },
    ];

    const [index, setIndex] = useState(0);
    const timerRef = useRef(null);

    const next = () => setIndex((p) => (p + 1) % slides.length);
    const prev = () => setIndex((p) => (p - 1 + slides.length) % slides.length);
    const goto = (i) => setIndex(i);

    const start = () => {
        if (timerRef.current) return;
        timerRef.current = setInterval(() => {
            setIndex((p) => (p + 1) % slides.length);
        }, 5500);
    };
    const stop = () => {
        if (!timerRef.current) return;
        clearInterval(timerRef.current);
        timerRef.current = null;
    };

    /* 자동 슬라이드 시작/정리 */
    useEffect(() => {
        start();
        return () => stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return (
        <div
            className="hero-carousel"
            onMouseEnter={stop}
            onMouseLeave={start}
        >
            {slides.map((slideData, i) => (
                <div
                    key={slideData.key}
                    className={`hero-slide ${i === index ? 'active' : ''}`}
                    style={{
                        background: slideData.bg,
                    }}
                >
                    <div className="hero-content">
                        <div className="hero-eyebrow">
                            {slideData.eyebrow}
                        </div>
                        <h2
                            className="hero-title"
                            style={{
                                background: slideData.accent,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            {slideData.title}
                        </h2>
                        <p className="hero-subtitle">
                            {slideData.subtitle}
                        </p>
                    </div>

                    <div className="hero-visual" />
                </div>
            ))}

            <button aria-label="이전" onClick={prev} className="hero-arrow prev">
                ‹
            </button>
            <button aria-label="다음" onClick={next} className="hero-arrow next">
                ›
            </button>

            <div className="hero-dots">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goto(i)}
                        aria-label={`슬라이드 ${i + 1}`}
                        className={`dot ${index === i ? 'active' : ''}`}
                    />
                ))}
            </div>

            {/* 진행 바 */}
            <div className="hero-progress">
                <span style={{ transform: `scaleX(${(index + 1) / slides.length})` }} />
            </div>
        </div>
    );
}

function TemplateCarousel({ images = [] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        setCurrentIndex(0);
    }, [images]);

    const prevSlide = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const nextSlide = () => {
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    if (!images || images.length === 0) {
        return (
            <div className="carousel-container-placeholder">
                <i className="fas fa-image"></i>
                <p>미리보기 이미지가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="carousel-container">
            {images.length > 1 && (
                <>
                    <button type="button" onClick={prevSlide} className="carousel-button prev">
                        &#10094;
                    </button>
                    <button type="button" onClick={nextSlide} className="carousel-button next">
                        &#10095;
                    </button>
                </>
            )}
            <div className="carousel-slide-wrapper">
                <div
                    className="carousel-slides"
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {images.map((image, index) => (
                        <div className="carousel-slide" key={index}>
                            <img src={image} alt={`템플릿 미리보기 ${index + 1}`} />
                        </div>
                    ))}
                </div>
            </div>
            {images.length > 1 && (
                <div className="carousel-indicators">
                    {images.map((_, index) => (
                        <button
                            type="button"
                            key={index}
                            className={`indicator-dot ${currentIndex === index ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(index)}
                            aria-label={`슬라이드 ${index + 1}로 이동`}
                        ></button>
                    ))}
                </div>
            )}
        </div>
    );
}

function App() {
    // appLogic에서 모든 상태와 함수들을 가져옴
    const {
      // PPT 진행 상황 상태들
      pptProgress,
      pptMessages,
      pptCurrentSlide,
      pptTotalSlides,
      pptCurrentImage,
      pptTotalImages,
    // 상태들
    isLoggedIn,
    activeSection,
    experiences,
    selected,
    spreadsheetId,
    isDriveInitialized,
    isInitializing,
    driveFiles,
    isLoading,
    isSheetLoading,
    isExperienceLoading,
    isDriveLoading,
    isUploadLoading,
    isRefreshLoading,
    isDeleteLoading,
    editingIndex,
    deletingFileIds,
    isViewModeLoading,
    isPptCreating,
    currentPath,
    imagePreviews,
    showImageModal,
    pptHistory,
    selectedImageForModal,
    imageLoadingStates,
    selectedExperience,
    showTemplateModal,
    selectedTemplateForModal,
    selectedThemeColor,
    showExperienceModal,
    showModal,
    form,
    formRef,
    driveViewMode,
    portfolioFolderId,
    presentationId,
    slides,
    accessToken,
    templateDescriptions,
    // 함수들
    showSection,
    logout,
    showAddExperienceModal,
    selectAllExperiences,
    refreshSheetsData,
    openExperienceModal,
    openImageModal,
    setImageLoadingState,
    setImageErrorState,
    retryImageLoad,
    driveService,
    toggleSelect,
    setSelectedExperiences,
    openTemplateModal,
    handleTemplateCancel,
    handleTemplateUse,
    handleThemeColorSelect,
    bgImagePreview,
    handleBgImageSelect,
    handleBgImageDrop,
    removeBgImage,
    closeModal,
    saveExperience,
    closeImageModal,
    closeExperienceModal,
    showEditExperienceModal,
    deleteIndividualExperience,
    handleImageSelect,
    handleDroppedFiles,
    removeImage,
    formatPeriod,
    createSheet,
    deleteSheet,
    switchViewMode,
    goBack,
    handleDriveFileUpload,
    handleDriveRefresh,
    handleDriveFileDelete,
    enterFolder,
    downloadFile,
    openFileInNewTab,
    formatFileSize,
    getFileTypeDisplay,
    convertImageUrl,
    convertImageUrlToThumbnail,
    convertImageUrlToFullSize,
    loadPptHistory,
    loadPptForEdit,
    getTextFromElement,
    updateElementTextAndLocal,
    updateElementStyle,
    // 상태 setter 함수들
    setActiveSection,
    setSlides,
    setForm,
    setSelectedImageForModal,
    setShowImageModal,
    showPrivacyPolicy,
    showTermsOfService,
    setShowPrivacyPolicy,
    setShowTermsOfService,
    pptHistoryCurrentPage,
    experienceCurrentPage,
    pptMakerExperienceCurrentPage,
    pptHistoryItemsPerPage,
    experienceItemsPerPage,
    pptMakerExperienceItemsPerPage,
    getPaginatedItems,
    getTotalPages,
    goToPptHistoryPage,
    goToPptHistoryNextPage,
    goToPptHistoryPrevPage,
    goToExperiencePage,
    goToExperienceNextPage,
    goToExperiencePrevPage,
    goToPptMakerExperiencePage,
    goToPptMakerExperienceNextPage,
    goToPptMakerExperiencePrevPage
  } = useAppLogic();

  /* 스크롤 시 상단바 스타일 토글 */
  useEffect(() => {
    if (!isLoggedIn) return;

    const el = document.querySelector(".mac-titlebar.is-minimal");
    if (!el) return;

    const onScroll = () => {
      if (window.scrollY > 8) el.classList.add("is-scrolled");
      else el.classList.remove("is-scrolled");
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLoggedIn]);

  // 실제 화면 렌더링
  return (
      <div>
        {/* 개인정보처리방침 페이지 */}
        {showPrivacyPolicy && (
          <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />
        )}

        {/* 사용자 약관 페이지 */}
        {showTermsOfService && (
          <TermsOfService onBack={() => setShowTermsOfService(false)} />
        )}

        {/* 로그인 페이지 */}
        {!isLoggedIn && !showPrivacyPolicy && !showTermsOfService && (
            <section id="loginPage" className="start-hero theme-apple">
                <div className="hero-blob a" />
                <div className="hero-blob b" />

                <div className="hero-left">
                    <div className="brand">
                        <h1 className="brand-title">Portra</h1>
                        <p className="brand-sub">포트폴리오 메이커</p>
                    </div>

                    <ul className="feature-list">
                        <li>
                            <i className="fas fa-check-circle" />
                            간편한 이력 관리
                        </li>
                        <li>
                            <i className="fas fa-check-circle" />
                            전문적인 PPT 템플릿
                        </li>
                        <li>
                            <i className="fas fa-check-circle" />
                            구글 드라이브 연동
                        </li>
                    </ul>
                </div>

                <div className="hero-right">
                    <div className="login-card">
                        <h2 className="login-title">시작하기</h2>
                        <div id="googleSignInDiv" className="gsi-anchor" />
                        <p className="login-hint">
                            Google 계정으로 안전하게 로그인해
                            <br />
                            나만의 포트폴리오를 만들어 보세요.
                        </p>
                        <div className="login-footer-links">
                            <button 
                                onClick={() => setShowPrivacyPolicy(true)}
                                className="footer-link-btn"
                            >
                                개인정보처리방침
                            </button>
                            <span className="footer-link-separator">|</span>
                            <button 
                                onClick={() => setShowTermsOfService(true)}
                                className="footer-link-btn"
                            >
                                사용자 약관
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        )}

        {/* 메인 페이지 */}
        {isLoggedIn && !showPrivacyPolicy && !showTermsOfService && (
            <div id="mainPage" className="theme-ink">
              {/* 상단 네비게이션 */}
              <TopNav 
                items={NAV_ITEMS} 
                active={activeSection} 
                onSelect={showSection} 
                onLogout={logout}
              />

              <div className="mac-container">
                <div className="mac-content">
                  {/* 메인 섹션 */}
                  {activeSection === 'main' && (
                      <div className="content-section content-main">
                        <div className="container-xl">
                          <HeroCarousel onSelect={showSection} />
                          <div className="mac-grid mac-grid-2">
                            <div className="mac-card" onClick={showAddExperienceModal}>
                              <i className="fas fa-plus-circle"></i>
                              <h3>이력 등록</h3>
                              <p>새로운 경험을 추가하세요</p>
                            </div>
                            <div className="mac-card" onClick={() => showSection('pptMaker')}>
                              <i className="fas fa-file-powerpoint"></i>
                              <h3>PPT 제작</h3>
                              <p>포트폴리오 만들기</p>
                            </div>
                          </div>
                        </div>
                      </div>
                  )}
                  {/* PPT 제작 섹션 */}
                  {activeSection === 'pptMaker' && (
                      <div id="pptMakerSection" className="content-section">
                        <div className="mac-window">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2 className="mb-0">포트폴리오 내용 선택</h2>
                            <div>
                              <button
                                  className="btn btn-dark"
                                  id="nextButton"
                                  disabled={selected.length === 0 || isExperienceLoading}
                                  onClick={() => {
                                    const picked = selected
                                        .sort((a,b)=>a-b)
                                        .map(i => experiences[i]);
                                    setSelectedExperiences(picked);
                                    setActiveSection('templateSelection'); // 템플릿 선택 탭으로 전환
                                  }}
                              >
                                다음
                              </button>
                            </div>
                          </div>
                          <div className="mac-window-content">
                            <div className="d-flex justify-content-end align-items-center mb-3">
                              <div>
                                <button className="btn btn-outline-primary me-2" onClick={refreshSheetsData} disabled={isExperienceLoading}>
                                  {isExperienceLoading ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        새로고침 중...
                                      </>
                                  ) : (
                                      <>
                                        <i className="fas fa-sync-alt"></i> 시트 새로고침
                                      </>
                                  )}
                                </button>
                                <button className="btn btn-outline-dark me-2" onClick={() => selectAllExperiences(false)} disabled={isExperienceLoading}>전체 해제</button>
                                <button className="btn btn-outline-dark me-2" onClick={() => selectAllExperiences(true)} disabled={isExperienceLoading}>전체 선택</button>
                              </div>
                            </div>
                            <div id="experienceList" className="mac-list">
                              {experiences.length === 0 ? (
                                  <div className="empty-state">
                                    <i className="fas fa-clipboard-list fa-3x mb-3"></i>
                                    <p>등록된 이력이 없습니다.</p>
                                    <button className="btn btn-outline-primary" onClick={refreshSheetsData}>
                                      <i className="fas fa-sync-alt"></i> 구글 시트에서 불러오기
                                    </button>
                                  </div>
                              ) : (
                                <>
                                  {getPaginatedItems(experiences, pptMakerExperienceCurrentPage, pptMakerExperienceItemsPerPage).map((exp, idx) => {
                                    const originalIndex = (pptMakerExperienceCurrentPage - 1) * pptMakerExperienceItemsPerPage + idx;
                                    return (
                                      <div className="list-group-item experience-list-item" key={originalIndex} onClick={() => openExperienceModal(exp)}>
                                        <div className="d-flex align-items-center">
                                          <div className="me-3 experience-image-container">
                                            {(exp.imageUrls && exp.imageUrls.length > 0) ? (
                                                <>
                                                  <div
                                                      className="experience-image-wrapper ppt-size"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openImageModal(convertImageUrlToFullSize(exp.imageUrls[0]), `${exp.title} - 이미지 1`);
                                                      }}
                                                  >
                                                    {imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'loading' && (
                                                      <div className="experience-image-loading ppt-size">
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                      </div>
                                                    )}
                                                    {imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'error' && (
                                                      <div className="experience-image-error ppt-size">
                                                        <i className="fas fa-exclamation-triangle"></i>
                                                      </div>
                                                    )}
                                                    <img
                                                        src={convertImageUrlToThumbnail(exp.imageUrls[0])}
                                                        alt={`${exp.title} 이미지 1`}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className={`experience-image ${imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'loading' ? 'loading' : ''}`}
                                                        onLoad={() => setImageLoadingState(`${exp.imageUrls[0]}_${exp.title} 이미지 1`, false)}
                                                        onError={async (e) => {
                                                          if (e.target.dataset.converting === 'true') {
                                                            return;
                                                          }
                                                        
                                                          e.target.dataset.converting = 'true';
                                                          await retryImageLoad(e.target, exp.imageUrls[0], 0, setImageLoadingState, setImageErrorState, driveService);
                                                          e.target.dataset.converting = 'false';
                                                        }}
                                                    />
                                                  </div>
                                                  {exp.imageUrls.length > 1 && (
                                                      <div className="experience-image-count">
                                                        +{exp.imageUrls.length - 1}
                                                      </div>
                                                  )}
                                                </>
                                            ) : (
                                                <div
                                                    className="experience-no-image ppt-size"
                                                    title="이미지 없음"
                                                >
                                                  <i className="fas fa-image experience-no-image-icon"></i>
                                                </div>
                                            )}
                                          </div>
                                          <div className="flex-grow-1">
                                            <h6 className="mb-1">{exp.title}</h6>
                                            <p className="mb-1"><small>{exp.period}</small></p>
                                            <p className="mb-0">{exp.description}</p>
                                          </div>
                                          <div className="form-check ms-3" onClick={(e) => e.stopPropagation()}>
                                            <input className="form-check-input" type="checkbox" checked={selected.includes(originalIndex)} onChange={() => toggleSelect(originalIndex)} />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {getTotalPages(experiences, pptMakerExperienceItemsPerPage) > 1 && (
                                    <div className="pagination-container mt-3">
                                      <div className="pagination-info mb-2">
                                        <small className="text-white-50">
                                          {((pptMakerExperienceCurrentPage - 1) * pptMakerExperienceItemsPerPage) + 1} - {Math.min(pptMakerExperienceCurrentPage * pptMakerExperienceItemsPerPage, experiences.length)} / {experiences.length}
                                        </small>
                                      </div>
                                      <div className="pagination-controls d-flex justify-content-center align-items-center gap-2">
                                        <button
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={goToPptMakerExperiencePrevPage}
                                          disabled={pptMakerExperienceCurrentPage === 1}
                                        >
                                          <i className="fas fa-chevron-left"></i> 이전
                                        </button>
                                        <div className="pagination-pages d-flex gap-1">
                                          {Array.from({ length: getTotalPages(experiences, pptMakerExperienceItemsPerPage) }, (_, i) => i + 1).map((page) => (
                                            <button
                                              key={page}
                                              className={`btn btn-sm ${page === pptMakerExperienceCurrentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                                              onClick={() => goToPptMakerExperiencePage(page)}
                                            >
                                              {page}
                                            </button>
                                          ))}
                                        </div>
                                        <button
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={goToPptMakerExperienceNextPage}
                                          disabled={pptMakerExperienceCurrentPage === getTotalPages(experiences, pptMakerExperienceItemsPerPage)}
                                        >
                                          다음 <i className="fas fa-chevron-right"></i>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                  )}

                  {/* 템플릿 선택 섹션 */}
                  {activeSection === 'templateSelection' && (
                      <div id="templateSelection" className="mac-content">
                        <h2>{isPptCreating ? '포트폴리오 생성중입니다' : '템플릿을 선택하세요'}</h2>
                        {isPptCreating ? (
                          <div className="text-center p-5">
                            <div className="loading-progress-container mb-4">
                              <div className="loading-progress-bar">
                                <div className="loading-progress-fill" style={{ width: `${pptProgress}%` }}></div>
                              </div>
                              <div className="loading-progress-text mt-2">
                                <span className="white-text">{Math.round(pptProgress)}%</span>
                              </div>
                            </div>
                            <div className="loading-log">
                              {pptMessages.map((messageObj) => (
                                <div key={messageObj.id} className="loading-log-item">
                                  <i className="fas fa-circle me-2"></i>
                                  <span className="white-text">{messageObj.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="template-grid">
                            <div className="mac-card" onClick={() => openTemplateModal('basic')}>
                              <h3>기본 템플릿</h3>
                              <p>깔끔하고 전문적인 레이아웃</p>
                            </div>
                            <div className="mac-card" onClick={() => openTemplateModal('timeline')}>
                              <h3>타임라인 템플릿</h3>
                              <p>시간 흐름에 따른 구성</p>
                            </div>
                            <div className="mac-card" onClick={() => openTemplateModal('photo')}>
                              <h3>사진강조 템플릿</h3>
                              <p>이미지 중심의 구성</p>
                            </div>
                          </div>
                        )}
                      </div>
                  )}

                  {/* PPT 편집기 섹션 */}
                  <div className="App">
                    {activeSection === 'editor' && (
                        <div className="content-section">
                          <div className="ppt-editor">
                            <div className="editor-toolbar">
                              <button onClick={() => setActiveSection('myPage')} className="btn btn-outline-secondary me-2">
                                <i className="fas fa-arrow-left"></i> 뒤로가기
                              </button>
                              <button onClick={() => window.open(`https://docs.google.com/presentation/d/${presentationId}/edit`, '_blank')} className="btn btn-primary">
                                <i className="fas fa-external-link-alt"></i> Google Slides에서 열기
                              </button>
                            </div>

                            {isLoading ? (
                              <div className="text-center p-5">
                                <div className="spinner-border text-primary mb-3 loading-spinner" role="status">
                                  <span className="visually-hidden">로딩중...</span>
                                </div>
                                <p className="white-text">PPT 데이터를 불러오는 중입니다...</p>
                              </div>
                            ) : slides.length === 0 ? (
                              <div className="text-center p-5">
                                <i className="fas fa-file-powerpoint fa-3x mb-3 text-muted"></i>
                                <p className="text-muted">슬라이드 데이터를 불러올 수 없습니다.</p>
                                <button onClick={() => setActiveSection('myPage')} className="btn btn-outline-primary">
                                  <i className="fas fa-arrow-left"></i> 마이페이지로 돌아가기
                                </button>
                              </div>
                            ) : (
                              <div className="editor-canvas">
                                {slides.map((slide, sIdx) => (
                                  <div key={slide.objectId || sIdx} className="editor-slide">
                                    <div className="slide-header">슬라이드 {sIdx + 1}</div>
                                    <div className="slide-body">
                                      {slide.pageElements?.filter(el => {
                                        // 텍스트 요소만 필터링 (shape이 있고 text 속성이 있는 요소)
                                        return el.shape && el.shape.text && el.shape.text.textElements;
                                      }).map((el) => {
                                        const elText = getTextFromElement(el);
                                        const elId = el.objectId;

                                        return (
                                            <div key={elId} className="text-box">
                                              <input
                                                  type="text"
                                                  className="text-input"
                                                  value={elText}
                                                  onChange={e => {
                                                    setSlides(prev => prev.map(sl => {
                                                      if (sl.objectId !== slide.objectId) return sl;
                                                      return {
                                                        ...sl,
                                                        pageElements: sl.pageElements.map(pe => {
                                                          if (pe.objectId !== elId) return pe;
                                                          const newShape = {
                                                            ...pe.shape,
                                                            text: {
                                                              ...pe.shape?.text,
                                                              textElements: [{ textRun: { content: e.target.value } }]
                                                            }
                                                          };
                                                          return { ...pe, shape: newShape };
                                                        })
                                                      };
                                                    }));
                                                  }}
                                                  onBlur={async e => {
                                                    await updateElementTextAndLocal(presentationId, elId, e.target.value, accessToken);
                                                  }}
                                              />

                                              <div className="text-controls">
                                                <select
                                                    onChange={async (ev) => {
                                                      const fontFamily = ev.target.value;
                                                      if (!fontFamily) return;
                                                      await updateElementStyle(presentationId, elId, { fontFamily }, accessToken);
                                                    }}
                                                >
                                                  <option value="">글꼴</option>
                                                  <option value="Arial">Arial</option>
                                                  <option value="Noto Sans KR">Noto Sans KR</option>
                                                  <option value="Roboto">Roboto</option>
                                                  <option value="Times New Roman">Times New Roman</option>
                                                </select>


                                                <input
                                                    type="number"
                                                    placeholder="크기(pt)"
                                                    onBlur={async (ev) => {
                                                      const size = Number(ev.target.value);
                                                      if (!size || size <= 0) return;
                                                      await updateElementStyle(presentationId, elId, { fontSize: { magnitude: size, unit: 'PT' } }, accessToken);
                                                    }}
                                                />
                                                <input
                                                    type="color"
                                                    onChange={async (ev) => {
                                                      const hex = ev.target.value;
                                                      const r = parseInt(hex.slice(1, 3), 16) / 255;
                                                      const g = parseInt(hex.slice(3, 5), 16) / 255;
                                                      const b = parseInt(hex.slice(5, 7), 16) / 255;
                                                      const colorObj = { foregroundColor: { opaqueColor: { rgbColor: { red: r, green: g, blue: b } } } };
                                                      await updateElementStyle(presentationId, elId, colorObj, accessToken);
                                                    }}
                                                />
                                              </div>
                                            </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                              ))}
                            </div>
                            )}
                          </div>
                        </div>
                    )}
                  </div>



                  {/* 구글 드라이브 섹션 */}
                  {activeSection === 'drive' && (
                      <div id="driveSection" className="content-section">
                        <div className="mac-window">
                          <h2>구글 드라이브</h2>
                          <div className="mac-window-content">
                            {/* 드라이브 연동 상태 - 로그인된 상태에서는 초기화 중이거나 연동 실패 시에만 표시 */}
                            {!isDriveInitialized && (
                              <div className="drive-status mb-4">
                                {isLoggedIn || isInitializing ? (
                                  <div className="status-indicator loading">
                                    <div className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                                    <span>구글 드라이브 연동 중...</span>
                                  </div>
                                ) : (
                                  <>
                                    <div className="status-indicator disconnected">
                                      <i className="fas fa-exclamation-circle"></i>
                                      <span>구글 드라이브가 연동되지 않음</span>
                                    </div>
                                    <div className="drive-help">
                                      <small className="white-text">
                                        구글 드라이브 연동이 필요합니다. 구글 계정으로 로그인해주세요.
                                      </small>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {/* 시트 관리 버튼 */}
                            {isDriveInitialized && (
                                <div className="sheet-management">
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4>포트폴리오 시트 관리</h4>
                                    <div>
                                      {spreadsheetId ? (
                                          <button
                                              className="btn btn-outline-danger btn-sm"
                                              onClick={deleteSheet}
                                              disabled={isSheetLoading}
                                          >
                                            {isSheetLoading ? (
                                                <>
                                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                  삭제 중...
                                                </>
                                            ) : (
                                                <>
                                                  <i className="fas fa-trash-alt"></i> 시트 삭제
                                                </>
                                            )}
                                          </button>
                                      ) : (
                                          <button
                                              className="btn btn-outline-success btn-sm"
                                              onClick={createSheet}
                                              disabled={isSheetLoading}
                                          >
                                            {isSheetLoading ? (
                                                <>
                                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                  생성 중...
                                                </>
                                            ) : (
                                                <>
                                                  <i className="fas fa-plus"></i> 시트 생성
                                                </>
                                            )}
                                          </button>
                                      )}
                                    </div>
                                  </div>
                                  {!spreadsheetId && (
                                      <div className="alert alert-info" role="alert">
                                        <i className="fas fa-info-circle me-2"></i>
                                        시트파일이 없습니다. 새로 생성해주세요.
                                      </div>
                                  )}
                                </div>
                            )}

                            {/* 뷰 모드 선택 */}
                            {isDriveInitialized && (
                                <div className="view-mode-selector">
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4>파일 보기</h4>
                                    <div className="btn-group" role="group">
                                      <button
                                          type="button"
                                          className={`btn btn-sm ${driveViewMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                                          onClick={() => switchViewMode('all')}
                                          disabled={isViewModeLoading}
                                      >
                                        <i className="fas fa-globe"></i> 전체 파일
                                      </button>
                                      <button
                                          type="button"
                                          className={`btn btn-sm ${driveViewMode === 'portfolio' ? 'btn-primary' : 'btn-outline-primary'}`}
                                          onClick={() => switchViewMode('portfolio')}
                                          disabled={!portfolioFolderId || isViewModeLoading}
                                          title={!portfolioFolderId ? '포트폴리오 폴더가 없습니다. 시트를 먼저 생성해주세요.' : '포트폴리오 폴더 보기'}
                                      >
                                        {!portfolioFolderId ? (
                                            <>
                                              <i className="fas fa-folder-plus"></i> 포트폴리오 폴더
                                            </>
                                        ) : (
                                            <>
                                              <i className="fas fa-folder"></i> 포트폴리오 폴더
                                            </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                            )}

                            {/* 구분선 */}
                            {isDriveInitialized && (
                                <hr className="gradient-divider" />
                            )}

                            {/* 파일 목록 */}
                            {isDriveInitialized && (
                                <div className="drive-files">
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="d-flex align-items-center">
                                      {currentPath.length > 0 && (
                                          <button
                                              className="btn btn-outline-secondary btn-sm me-3"
                                              onClick={goBack}
                                              disabled={isViewModeLoading}
                                          >
                                            <i className="fas fa-arrow-left"></i> 뒤로가기
                                          </button>
                                      )}
                                      <h4>
                                        {currentPath.length > 0 ? currentPath[currentPath.length - 1].name :
                                            driveViewMode === 'all' ? '전체 파일' : '포트폴리오 폴더'}
                                      </h4>
                                    </div>
                                    <div>
                                      <label htmlFor="drive-upload-input" className={`btn btn-outline-success btn-sm me-2 ${isUploadLoading ? 'disabled file-upload-btn' : ''}`}>
                                        {isUploadLoading ? (
                                            <>
                                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                              업로드 중...
                                            </>
                                        ) : (
                                            <>
                                              <i className="fas fa-upload"></i> 업로드
                                            </>
                                        )}
                                      </label>
                                      <input
                                          id="drive-upload-input"
                                          type="file"
                                          className="hidden-input"
                                          onChange={handleDriveFileUpload}
                                      />
                                      <button className="btn btn-outline-primary btn-sm" onClick={handleDriveRefresh} disabled={isRefreshLoading}>
                                        {isRefreshLoading ? (
                                            <>
                                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                              새로고침 중...
                                            </>
                                        ) : (
                                            <>
                                              <i className="fas fa-sync-alt"></i> 새로고침
                                            </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="file-list">
                                    {isDriveLoading ? (
                                        <div className="text-center p-4">
                                          <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">로딩중...</span>
                                          </div>
                                          <p className="mt-2 white-text">파일 목록을 불러오는 중...</p>
                                        </div>
                                    ) : driveFiles.length === 0 ? (
                                        <div className="empty-state">
                                          <i className="fas fa-folder-open fa-3x mb-3"></i>
                                          <p>
                                            {driveViewMode === 'portfolio' ? '포트폴리오 폴더가 비어있습니다.' : '파일이 없습니다.'}
                                          </p>
                                        </div>
                                    ) : (
                                        <>
                                          {/* 폴더들 먼저 표시 */}
                                          {driveFiles
                                              .filter(file => file.mimeType === 'application/vnd.google-apps.folder')
                                              .map((file, index, array) => (
                                                  <div key={file.id}>
                                                    <div className="file-item list-group-item folder-item" onClick={() => enterFolder(file.id, file.name)}>
                                                      <div className="d-flex align-items-center">
                                                        <i className="fas fa-folder me-3 folder-icon"></i>
                                                        <div className="flex-grow-1">
                                                          <h6 className="mb-1 folder-name">
                                                            {file.name}
                                                          </h6>
                                                          <small className="white-text">
                                                            폴더
                                                          </small>
                                                        </div>
                                                        <div className="file-size">
                                                          <small className="white-text">
                                                            -
                                                          </small>
                                                        </div>
                                                        <div className="file-modification-date">
                                                          <small className="white-text">
                                                            수정날짜 {new Date(file.modifiedTime).toLocaleDateString()}
                                                          </small>
                                                        </div>
                                                        <div className="file-actions d-flex align-items-center">
                                                          <button
                                                              className="btn btn-sm btn-outline-danger"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDriveFileDelete(file.id);
                                                              }}
                                                              disabled={isDeleteLoading}
                                                          >
                                                            {isDeleteLoading ? (
                                                                <>
                                                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                                  삭제 중...
                                                                </>
                                                            ) : (
                                                                <>
                                                                  <i className="fas fa-trash-alt"></i> 삭제
                                                                </>
                                                            )}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    {/* 폴더들 사이 구분선 */}
                                                    {index < array.length - 1 && (
                                                        <hr style={{
                                                          border: 'none',
                                                          height: '1px',
                                                          background: 'linear-gradient(to right, transparent, #ffc107, transparent)',
                                                          margin: '8px 0'
                                                        }} />
                                                    )}
                                                  </div>
                                              ))}

                                          {/* 폴더와 파일 사이 구분선 */}
                                          {driveFiles.filter(file => file.mimeType === 'application/vnd.google-apps.folder').length > 0 &&
                                              driveFiles.filter(file => file.mimeType !== 'application/vnd.google-apps.folder').length > 0 && (
                                                  <hr className="simple-divider" />
                                              )}

                                          {/* 파일들 표시 */}
                                          {driveFiles
                                              .filter(file => file.mimeType !== 'application/vnd.google-apps.folder')
                                              .map((file, index, array) => (
                                                  <div key={file.id}>
                                                    <div className="file-item list-group-item">
                                                      <div className="d-flex align-items-center">
                                                        <i className={`fas ${
                                                            file.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'fa-file-excel' :
                                                                file.mimeType === 'application/vnd.google-apps.document' ? 'fa-file-word' :
                                                                    file.mimeType === 'application/vnd.google-apps.presentation' ? 'fa-file-powerpoint' :
                                                                        file.mimeType.startsWith('image/') ? 'fa-file-image' :
                                                                            'fa-file'
                                                        } me-3 ${file.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'file-type-spreadsheet' :
                                                              file.mimeType === 'application/vnd.google-apps.document' ? 'file-type-document' :
                                                                  file.mimeType === 'application/vnd.google-apps.presentation' ? 'file-type-presentation' :
                                                                      file.mimeType.startsWith('image/') ? 'file-type-image' : ''}`}></i>
                                                        <div className="flex-grow-1">
                                                          <h6
                                                              className="mb-1 file-name file-item"
                                                              onClick={() => openFileInNewTab(file)}
                                                          >
                                                            {file.name}
                                                          </h6>
                                                          <small className="white-text">
                                                            {getFileTypeDisplay(file)}
                                                          </small>
                                                        </div>
                                                        <div className="file-size">
                                                          <small className="white-text">
                                                            {formatFileSize(file.size)}
                                                          </small>
                                                        </div>
                                                        <div className="file-modification-date">
                                                          <small className="white-text">
                                                            수정날짜 {new Date(file.modifiedTime).toLocaleDateString()}
                                                          </small>
                                                        </div>
                                                        <div className="file-actions d-flex align-items-center">
                                                          <button
                                                              className="btn btn-sm btn-outline-primary"
                                                              onClick={() => downloadFile(file)}
                                                              title="파일 다운로드"
                                                          >
                                                            <i className="fas fa-download"></i> 다운로드
                                                          </button>
                                                          <button
                                                              className="btn btn-sm btn-outline-danger"
                                                              onClick={() => handleDriveFileDelete(file.id)}
                                                              disabled={deletingFileIds.has(file.id)}
                                                          >
                                                            {deletingFileIds.has(file.id) ? (
                                                                <>
                                                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                                  삭제 중...
                                                                </>
                                                            ) : (
                                                                <>
                                                                  <i className="fas fa-trash-alt"></i> 삭제
                                                                </>
                                                            )}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    {/* 파일들 사이 구분선 */}
                                                    {index < array.length - 1 && (
                                                        <hr style={{
                                                          border: 'none',
                                                          height: '1px',
                                                          background: 'linear-gradient(to right, transparent, #dee2e6, transparent)',
                                                          margin: '8px 0'
                                                        }} />
                                                    )}
                                                  </div>
                                              ))}
                                        </>
                                    )}
                                  </div>
                                </div>
                            )}
                          </div>
                        </div>
                      </div>
                  )}
                  {/* 학교 포털 섹션 */}
                  {activeSection === 'portal' && (
                      <div id="portalSection" className="content-section">
                        <div className="mac-window">
                          <h2>학교 포털</h2>
                          <div className="mac-window-content text-center p-5">
                            <i className="fas fa-university fa-3x mb-3 text-primary"></i>
                            <h3 className="mb-3">학교 포털로 이동</h3>
                            <p className="mb-4">학교 포털에서 학사 정보를 확인하세요.</p>
                            <a href="https://portal.yuhan.ac.kr/" target="_blank" rel="noopener noreferrer" className="btn btn-primary">학교 포털 열기</a>
                          </div>
                        </div>
                      </div>
                  )}
                  {/* 마이페이지 섹션 */}
                  {activeSection === 'myPage' && (
                      <div id="myPageSection" className="content-section">
                        <div className="mac-grid">
                          <div className="mac-window">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h2>PPT 기록</h2>
                              <button className="btn btn-outline-primary btn-sm" onClick={loadPptHistory}>
                                <i className="fas fa-sync-alt"></i> 새로고침
                              </button>
                            </div>
                            <div id="pptHistory" className="mac-list">
                              {isLoading ? (
                                <div className="text-center p-4">
                                  <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">로딩중...</span>
                                  </div>
                                  <p className="mt-2">PPT 기록을 불러오는 중...</p>
                                </div>
                              ) : pptHistory.length === 0 ? (
                                <div className="empty-state">
                                  <i className="fas fa-history fa-3x mb-3"></i>
                                  <p>아직 제작한 PPT가 없습니다.</p>
                                </div>
                              ) : (
                                <>
                                  {getPaginatedItems(pptHistory, pptHistoryCurrentPage, pptHistoryItemsPerPage).map((ppt, index) => (
                                      <div
                                          key={ppt.id}
                                          className="list-group-item mac-list-item d-flex align-items-center file-item"
                                          onClick={() => window.open(`https://docs.google.com/presentation/d/${ppt.id}/edit`, '_blank')}
                                      >
                                        <div className="me-3">
                                          <i className="fas fa-file-powerpoint text-primary fa-2x"></i>
                                        </div>
                                        <div className="flex-grow-1">
                                          <h6 className="mb-1 text-white">{ppt.name}</h6>
                                          <small className="text-white-50">
                                            생성일: {new Date(ppt.createdTime).toLocaleDateString()}
                                          </small>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                          <button
                                              className="btn btn-outline-secondary btn-sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                loadPptForEdit(ppt.id);
                                              }}
                                          >
                                            <i className="fas fa-edit"></i> 수정
                                          </button>
                                          <button
                                              className="btn btn-outline-danger btn-sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`"${ppt.name}" 파일을 삭제하시겠습니까?`)) {
                                                  handleDriveFileDelete(ppt.id, true);
                                                }
                                              }}
                                          >
                                            <i className="fas fa-trash-alt"></i> 삭제
                                          </button>
                                        </div>
                                      </div>
                                  ))}
                                  {getTotalPages(pptHistory, pptHistoryItemsPerPage) > 1 && (
                                    <div className="pagination-container mt-3">
                                      <div className="pagination-info mb-2">
                                        <small className="text-white-50">
                                          {((pptHistoryCurrentPage - 1) * pptHistoryItemsPerPage) + 1} - {Math.min(pptHistoryCurrentPage * pptHistoryItemsPerPage, pptHistory.length)} / {pptHistory.length}
                                        </small>
                                      </div>
                                      <div className="pagination-controls d-flex justify-content-center align-items-center gap-2">
                                        <button
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={goToPptHistoryPrevPage}
                                          disabled={pptHistoryCurrentPage === 1}
                                        >
                                          <i className="fas fa-chevron-left"></i> 이전
                                        </button>
                                        <div className="pagination-pages d-flex gap-1">
                                          {Array.from({ length: getTotalPages(pptHistory, pptHistoryItemsPerPage) }, (_, i) => i + 1).map((page) => (
                                            <button
                                              key={page}
                                              className={`btn btn-sm ${page === pptHistoryCurrentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                                              onClick={() => goToPptHistoryPage(page)}
                                            >
                                              {page}
                                            </button>
                                          ))}
                                        </div>
                                        <button
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={goToPptHistoryNextPage}
                                          disabled={pptHistoryCurrentPage === getTotalPages(pptHistory, pptHistoryItemsPerPage)}
                                        >
                                          다음 <i className="fas fa-chevron-right"></i>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mac-window">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h2>이력 관리</h2>
                              <button className="btn btn-outline-primary btn-sm" onClick={refreshSheetsData} disabled={isExperienceLoading}>
                                {isExperienceLoading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    새로고침 중...
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-sync-alt"></i> 시트 새로고침
                                  </>
                                )}
                              </button>
                            </div>
                            <div id="experienceManagement" className="mac-list">
                              {isExperienceLoading ? (
                                <div className="text-center p-4">
                                  <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">로딩중...</span>
                                  </div>
                                  <p className="mt-2">이력 목록을 불러오는 중...</p>
                                </div>
                              ) : experiences.length === 0 ? (
                                  <div className="empty-state">
                                    <i className="fas fa-clipboard-list fa-3x mb-3"></i>
                                    <p>등록된 이력이 없습니다.</p>
                                    <button className="btn btn-outline-primary" onClick={refreshSheetsData}>
                                      <i className="fas fa-sync-alt"></i> 구글 시트에서 불러오기
                                    </button>
                                  </div>
                              ) : (
                                <>
                                  {getPaginatedItems(experiences, experienceCurrentPage, experienceItemsPerPage).map((exp, idx) => {
                                    const originalIndex = (experienceCurrentPage - 1) * experienceItemsPerPage + idx;
                                    return (
                                      <div className="list-group-item file-item" key={originalIndex} onClick={() => openExperienceModal(exp)}>
                                        <div className="d-flex align-items-center">
                                          <div className="me-3 experience-image-container">
                                            {(exp.imageUrls && exp.imageUrls.length > 0) ? (
                                                <>
                                                  <div
                                                      className="experience-image-wrapper"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openImageModal(convertImageUrlToFullSize(exp.imageUrls[0]), `${exp.title} - 이미지 1`);
                                                      }}
                                                  >
                                                    {imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'loading' && (
                                                      <div className="experience-image-loading">
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                      </div>
                                                    )}
                                                    {imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'error' && (
                                                      <div className="experience-image-error">
                                                        <i className="fas fa-exclamation-triangle"></i>
                                                      </div>
                                                    )}
                                                    <img
                                                        src={convertImageUrlToThumbnail(exp.imageUrls[0])}
                                                        alt={`${exp.title} 이미지 1`}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className={`experience-image ${imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'loading' ? 'loading' : ''}`}
                                                        onLoad={() => setImageLoadingState(`${exp.imageUrls[0]}_${exp.title} 이미지 1`, false)}
                                                        onError={async (e) => {
                                                          if (e.target.dataset.converting === 'true') {
                                                            return;
                                                          }
                                                        
                                                          e.target.dataset.converting = 'true';
                                                          await retryImageLoad(e.target, exp.imageUrls[0], 0, setImageLoadingState, setImageErrorState, driveService);
                                                          e.target.dataset.converting = 'false';
                                                        }}
                                                    />
                                                  </div>
                                                  {exp.imageUrls.length > 1 && (
                                                      <div className="experience-image-count">
                                                        +{exp.imageUrls.length - 1}
                                                      </div>
                                                  )}
                                                </>
                                            ) : (
                                                <div
                                                    className="experience-no-image"
                                                    title="이미지 없음"
                                                >
                                                  <i className="fas fa-image experience-no-image-icon"></i>
                                                </div>
                                            )}
                                          </div>
                                          <div className="flex-grow-1">
                                            <h6 className="mb-1">{exp.title}</h6>
                                            <p className="mb-1"><small>{exp.period}</small></p>
                                            <p className="mb-0">{exp.description}</p>
                                          </div>
                                          <div className="d-flex align-items-center gap-2">
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  showEditExperienceModal(originalIndex);
                                                }}
                                                disabled={isExperienceLoading}
                                            >
                                              <i className="fas fa-edit"></i> 수정
                                            </button>
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  deleteIndividualExperience(originalIndex);
                                                }}
                                                disabled={isExperienceLoading}
                                            >
                                              <i className="fas fa-trash-alt"></i> 삭제
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {getTotalPages(experiences, experienceItemsPerPage) > 1 && (
                                    <div className="pagination-container mt-3">
                                      <div className="pagination-info mb-2">
                                        <small className="text-white-50">
                                          {((experienceCurrentPage - 1) * experienceItemsPerPage) + 1} - {Math.min(experienceCurrentPage * experienceItemsPerPage, experiences.length)} / {experiences.length}
                                        </small>
                                      </div>
                                      <div className="pagination-controls d-flex justify-content-center align-items-center gap-2">
                                        <button
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={goToExperiencePrevPage}
                                          disabled={experienceCurrentPage === 1}
                                        >
                                          <i className="fas fa-chevron-left"></i> 이전
                                        </button>
                                        <div className="pagination-pages d-flex gap-1">
                                          {Array.from({ length: getTotalPages(experiences, experienceItemsPerPage) }, (_, i) => i + 1).map((page) => (
                                            <button
                                              key={page}
                                              className={`btn btn-sm ${page === experienceCurrentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                                              onClick={() => goToExperiencePage(page)}
                                            >
                                              {page}
                                            </button>
                                          ))}
                                        </div>
                                        <button
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={goToExperienceNextPage}
                                          disabled={experienceCurrentPage === getTotalPages(experiences, experienceItemsPerPage)}
                                        >
                                          다음 <i className="fas fa-chevron-right"></i>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* 푸터 - 모든 섹션에 표시 */}
        {isLoggedIn && !showPrivacyPolicy && !showTermsOfService && (
          <footer className="main-footer">
            <div className="footer-content">
              <div className="footer-links">
                <button 
                  onClick={() => setShowPrivacyPolicy(true)}
                  className="footer-link-btn"
                >
                  개인정보처리방침
                </button>
                <span className="footer-link-separator">|</span>
                <button 
                  onClick={() => setShowTermsOfService(true)}
                  className="footer-link-btn"
                >
                  사용자 약관
                </button>
              </div>
              <p className="footer-copyright">© 2025 Portra. All rights reserved.</p>
            </div>
          </footer>
        )}

        {/* 이력 추가 모달 */}
        {showModal && (
            <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999}} tabIndex="-1">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content mac-modal">
                  <div className="modal-header">
                    <h5 className="modal-title">{editingIndex !== null ? '이력 수정' : '새 이력 추가'}</h5>
                    <button type="button" className="btn-close" onClick={closeModal}></button>
                  </div>
                  <form onSubmit={saveExperience} ref={formRef}>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label className="form-label">제목</label>
                        <input type="text" className="form-control" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">기간</label>
                        <div className="period-container">
                          <div className="row">
                            <div className="col-6">
                              <label className="form-label small white-text">시작일</label>
                              <input
                                  type="date"
                                  className="form-control"
                                  required
                                  value={form.startDate}
                                  onChange={e => {
                                    const newStartDate = e.target.value;
                                    
                                    // 빈 값이거나 유효하지 않은 날짜 형식이면 검사하지 않음
                                    if (!newStartDate || newStartDate.length < 10) {
                                      setForm({ ...form, startDate: newStartDate });
                                      return;
                                    }
                                    
                                    setForm({ ...form, startDate: newStartDate });

                                    // 시작일이 종료일보다 늦으면 경고 후 종료일 초기화
                                    if (newStartDate && form.endDate && newStartDate > form.endDate) {
                                      alert('시작일은 종료일보다 이전이어야 합니다.');
                                      setForm(prev => ({ ...prev, endDate: '' }));
                                    }
                                  }}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label small white-text">종료일</label>
                              <input
                                  type="date"
                                  className="form-control"
                                  required
                                  value={form.endDate}
                                  onChange={e => {
                                    const newEndDate = e.target.value;
                                    
                                    // 빈 값이거나 유효하지 않은 날짜 형식이면 검사하지 않음
                                    if (!newEndDate || newEndDate.length < 10) {
                                      setForm({ ...form, endDate: newEndDate });
                                      return;
                                    }
                                    
                                    setForm({ ...form, endDate: newEndDate });

                                    // 종료일이 시작일보다 이르면 경고
                                    if (newEndDate && form.startDate && newEndDate < form.startDate) {
                                      alert('종료일은 시작일보다 이후여야 합니다.');
                                      setForm(prev => ({ ...prev, endDate: '' }));
                                    }
                                  }}
                              />
                            </div>
                          </div>

                          {form.startDate && form.endDate && (
                              <div className="period-preview">
                                <small className="white-text">
                                  선택된 기간: {formatPeriod(form.startDate, form.endDate)}
                                </small>
                              </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">설명</label>
                        <textarea className="form-control" rows="3" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">이미지 첨부</label>
                        <div
                            className="image-upload-container"
                            onClick={() => document.getElementById('imageInput').click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = '#007bff';
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = '#dee2e6';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = '#dee2e6';
                              const files = Array.from(e.dataTransfer.files);
                              handleDroppedFiles(files);
                            }}
                        >
                          <input
                              type="file"
                              id="imageInput"
                              className="file-input"
                              accept="image/*"
                              multiple
                              onChange={handleImageSelect}
                              style={{ display: 'none' }}
                          />
                          <i className="fas fa-cloud-upload-alt image-upload-icon"></i>
                          <div className="image-upload-text">클릭하여 이미지 선택 (여러 개 가능)</div>
                          <div className="image-upload-subtext">또는 이미지를 여기로 드래그하세요</div>
                        </div>
                        {imagePreviews.length > 0 && (
                            <div className="image-previews-container mt-3">
                              <h6 className="mb-2">선택된 이미지들:</h6>
                              <div className="row">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="col-md-4 col-sm-6 mb-2">
                                      <div className="image-preview-item position-relative">
                                        <img
                                            src={preview}
                                            alt={`이미지 ${index + 1}`}
                                            className="img-fluid rounded"
                                            style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                                            onError={async (e) => {
                                              if (e.target.dataset.converting === 'true') { return; }
                                              e.target.dataset.converting = 'true';
                                              await retryImageLoad(e.target, preview, 0, setImageLoadingState, setImageErrorState, driveService);
                                              e.target.dataset.converting = 'false';
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-1 image-delete-btn"
                                            onClick={() => removeImage(index)}
                                            style={{ zIndex: 10 }}
                                        >
                                        </button>
                                      </div>
                                    </div>
                                ))}
                              </div>
                            </div>
                        )}
                        <div className="image-size-info mt-2">
                          <small className="white-text">최대 파일 크기: 5MB, 지원 형식: JPG, PNG, GIF</small>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isExperienceLoading}>취소</button>
                      <button type="submit" className="btn btn-primary" disabled={isExperienceLoading}>
                        {isExperienceLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              {editingIndex !== null ? '수정 중...' : '저장 중...'}
                            </>
                        ) : (
                            editingIndex !== null ? '수정' : '저장'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}

        {/* 이미지 확대 모달 */}
        {showImageModal && selectedImageForModal && (
            <div
                className="modal fade show"
                style={{ display: 'block', background: 'rgba(0,0,0,0.8)', zIndex: 9999 }}
                tabIndex="-1"
                onClick={closeImageModal}
            >
              <div className="modal-dialog modal-dialog-centered modal-xl" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content bg-transparent border-0">
                  <div className="modal-header border-0 bg-transparent">
                    <h5 className="modal-title text-white">{selectedImageForModal.title}</h5>
                    <button type="button" className="btn-close btn-close-white" onClick={closeImageModal}></button>
                  </div>
                  <div className="modal-body text-center p-0" style={{ position: 'relative' }}>
                    {imageLoadingStates.get(`${selectedImageForModal.url}_${selectedImageForModal.title}`) === 'loading' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#007bff',
                        fontSize: '24px',
                        zIndex: 10
                      }}>
                        <i className="fas fa-spinner fa-spin"></i>
                        <div style={{ fontSize: '14px', marginTop: '10px' }}>이미지 로딩 중...</div>
                      </div>
                    )}
                    {imageLoadingStates.get(`${selectedImageForModal.url}_${selectedImageForModal.title}`) === 'error' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#dc3545',
                        fontSize: '24px',
                        zIndex: 10
                      }}>
                        <i className="fas fa-exclamation-triangle"></i>
                        <div style={{ fontSize: '14px', marginTop: '10px' }}>이미지를 불러올 수 없습니다</div>
                      </div>
                    )}
                    <img
                        src={convertImageUrlToFullSize(selectedImageForModal.url)}
                        alt={selectedImageForModal.title}
                        className="img-fluid"
                        loading="eager"
                        decoding="async"
                        style={{ 
                          maxHeight: '80vh', 
                          maxWidth: '100%',
                          opacity: imageLoadingStates.get(`${selectedImageForModal.url}_${selectedImageForModal.title}`) === 'loading' ? 0.5 : 1
                        }}
                        onLoad={() => setImageLoadingState(`${selectedImageForModal.url}_${selectedImageForModal.title}`, false)}
                        onError={async (e) => {
                          // 이미 변환 시도 중인지 확인 (무한 재귀 방지)
                          if (e.target.dataset.converting === 'true') {
                            return;
                          }
                          
                          e.target.dataset.converting = 'true';
                          await retryImageLoad(e.target, selectedImageForModal.url, 0, setImageLoadingState, setImageErrorState, driveService);
                          e.target.dataset.converting = 'false';
                        }}
                    />
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* 이력 상세 모달 */}
        {showExperienceModal && selectedExperience && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content mac-modal">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-clipboard-list me-2"></i>
                    {selectedExperience.title}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeExperienceModal}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="mb-3 white-text">기본 정보</h6>
                      <div className="mb-3">
                        <strong className="white-text">제목:</strong>
                        <p className="mt-1 white-text">{selectedExperience.title}</p>
                      </div>
                      <div className="mb-3">
                        <strong className="white-text">기간:</strong>
                        <p className="mt-1 white-text">{selectedExperience.period}</p>
                      </div>
                      <div className="mb-3">
                        <strong className="white-text">설명:</strong>
                        <p className="mt-1" style={{ whiteSpace: 'pre-wrap', color: 'white' }}>{selectedExperience.description}</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="mb-3 white-text">첨부 이미지</h6>
                      {selectedExperience.imageUrls && selectedExperience.imageUrls.length > 0 ? (
                        <div className="experience-images">
                          <div className="row g-2">
                            {selectedExperience.imageUrls.map((imageUrl, imgIdx) => (
                              <div key={imgIdx} className="col-6">
                                <div
                                  className="image-thumbnail"
                                  style={{
                                    width: '100%',
                                    height: '150px',
                                    overflow: 'hidden',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    border: '2px solid transparent',
                                    transition: 'border-color 0.2s',
                                    position: 'relative'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                  onClick={() => openImageModal(convertImageUrlToFullSize(imageUrl), `${selectedExperience.title} - 이미지 ${imgIdx + 1}`)}
                                >
                                  {imageLoadingStates.get(`${imageUrl}_${selectedExperience.title} 이미지 ${imgIdx + 1}`) === 'loading' && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      color: '#007bff',
                                      fontSize: '16px'
                                    }}>
                                      <i className="fas fa-spinner fa-spin"></i>
                                    </div>
                                  )}
                                  {imageLoadingStates.get(`${imageUrl}_${selectedExperience.title} 이미지 ${imgIdx + 1}`) === 'error' && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      color: '#dc3545',
                                      fontSize: '16px'
                                    }}>
                                      <i className="fas fa-exclamation-triangle"></i>
                                    </div>
                                  )}
                                  <img
                                    src={convertImageUrlToThumbnail(imageUrl)}
                                    alt={`${selectedExperience.title} 이미지 ${imgIdx + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover',
                                      opacity: imageLoadingStates.get(`${imageUrl}_${selectedExperience.title} 이미지 ${imgIdx + 1}`) === 'loading' ? 0.5 : 1
                                    }}
                                    onLoad={() => setImageLoadingState(`${imageUrl}_${selectedExperience.title} 이미지 ${imgIdx + 1}`, false)}
                                    onError={async (e) => {
                                      if (e.target.dataset.converting === 'true') {
                                        return;
                                      }
                                      
                                      e.target.dataset.converting = 'true';
                                      await retryImageLoad(e.target, imageUrl, 0, setImageLoadingState, setImageErrorState, driveService);
                                      e.target.dataset.converting = 'false';
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-center">
                            <small className="white-text">
                              총 {selectedExperience.imageUrls.length}개의 이미지
                            </small>
                          </div>
                        </div>
                      ) : (
                        <div className="experience-modal-no-image">
                          <i className="fas fa-image experience-modal-no-image-icon"></i>
                          <p className="experience-modal-no-image-text">첨부된 이미지가 없습니다</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeExperienceModal}>
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 템플릿 선택 모달 */}
        {showTemplateModal && selectedTemplateForModal && (() => {
            const templateInfo = templateDescriptions[selectedTemplateForModal];
            if (!templateInfo) return null;

            const imagesForCurrentTheme =
            (templateInfo.previewImages && templateInfo.previewImages[selectedThemeColor]) ||
            (templateInfo.previewImages && templateInfo.previewImages['light']) ||
            [];

            return(
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content mac-modal">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-file-powerpoint me-2"></i>
                    {templateDescriptions[selectedTemplateForModal]?.name}
                  </h5>
                  <button type="button" className="btn-close" onClick={handleTemplateCancel}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-12">
                      <h6 className="mb-3 white-text">템플릿 설명</h6>
                      <p className="mb-4" style={{ whiteSpace: 'pre-wrap', color: 'white' }}>
                        {templateDescriptions[selectedTemplateForModal]?.description}
                      </p>
                      
                      <div className="mb-4">
                            <h6 className="mb-3 white-text">템플릿 미리보기</h6>
                            <TemplateCarousel images={imagesForCurrentTheme} />
                        </div>
                      
                     <div className="theme-color-selector">
                       <h6 className="white-text">테마 색상</h6>
                       <div className="theme-color-options">
                         <div
                           className={`theme-color-option light ${selectedThemeColor === 'light' ? 'selected' : ''}`}
                           onClick={() => handleThemeColorSelect('light')}
                           title="밝은 테마 (흰색 배경, 검정 글씨)"
                         ></div>
                         <div
                           className={`theme-color-option dark ${selectedThemeColor === 'dark' ? 'selected' : ''}`}
                           onClick={() => handleThemeColorSelect('dark')}
                           title="어두운 테마 (검정 배경, 흰 글씨)"
                         ></div>
                         <div
                           className={`theme-color-option navy-white ${selectedThemeColor === 'navy-white' ? 'selected' : ''}`}
                           onClick={() => handleThemeColorSelect('navy-white')}
                           title="네이비-화이트 테마"
                         ></div>
                         <div
                           className={`theme-color-option navy-yellow ${selectedThemeColor === 'navy-yellow' ? 'selected' : ''}`}
                           onClick={() => handleThemeColorSelect('navy-yellow')}
                           title="네이비-옐로우 테마"
                         ></div>
                         <div
                           className={`theme-color-option darkgray-white ${selectedThemeColor === 'darkgray-white' ? 'selected' : ''}`}
                           onClick={() => handleThemeColorSelect('darkgray-white')}
                           title="다크그레이-화이트 테마"
                         ></div>
                         <div
                           className={`theme-color-option darkgreen-white ${selectedThemeColor === 'darkgreen-white' ? 'selected' : ''}`}
                           onClick={() => handleThemeColorSelect('darkgreen-white')}
                           title="다크그린-화이트 테마"
                         ></div>
                         <div
                           className={`theme-color-option lavenderpurple-black ${selectedThemeColor === 'lavenderpurple-black' ? 'selected' : ''}`}
                           onClick={() => handleThemeColorSelect('lavenderpurple-black')}
                           title="라벤더퍼플-블랙 테마"
                         ></div>
                       </div>
                     </div>
                      
                      <h6 className="mb-3 white-text">주요 특징</h6>
                      <div className="template-features">
                        {templateDescriptions[selectedTemplateForModal]?.features.map((feature, index) => (
                          <div key={index} className="feature-item mb-2 d-flex align-items-center">
                            <i className="fas fa-check-circle text-success me-2"></i>
                            <span className="white-text">{feature}</span>
                          </div>
                        ))}
                      </div>
                        <hr style={{ borderTop: '1px solid var(--ink-line)', margin: '20px 0' }} />
                        <h6 className="mb-3 white-text">배경 이미지 업로드 (선택)</h6>
                        <p className="mb-3" style={{ color: 'var(--ink-muted)', fontSize: '14px' }}>
                            이미지를 업로드하면 모든 슬라이드의 배경으로 적용됩니다. (테마 색상 무시)
                        </p>

                        {!bgImagePreview ? (
                            <div
                                className="image-upload-container"
                                onClick={() => document.getElementById('bgImageInput').click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.add('dragover');
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('dragover');
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('dragover');
                                    const files = Array.from(e.dataTransfer.files);
                                    handleBgImageDrop(files);
                                }}
                            >
                                <input
                                    type="file"
                                    id="bgImageInput"
                                    className="file-input"
                                    accept="image/*"
                                    onChange={handleBgImageSelect}
                                    style={{ display: 'none' }}
                                />
                                <i className="fas fa-image image-upload-icon"></i>
                                <div className="image-upload-text">클릭하여 배경 이미지 선택</div>
                                <div className="image-upload-subtext">또는 이미지를 여기로 드래그하세요 (5MB 이하)</div>
                            </div>
                        ) : (
                            <div className="image-preview">
                                <img src={bgImagePreview} alt="배경 이미지 미리보기" />
                                <button
                                    type="button"
                                    className="remove-image"
                                    onClick={removeBgImage}
                                >
                                    &times;
                                </button>
                            </div>
                        )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleTemplateCancel}>
                    취소
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleTemplateUse}>
                    템플릿 사용
                  </button>
                  </div>
                </div>
              </div>
            </div>
            );
        })()}
      </div>
  );
}

export default App;
