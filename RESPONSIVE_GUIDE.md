# Responsive Design Guide

## 개요

이 문서는 Heyversus 프로젝트의 반응형 디자인 가이드라인을 정의합니다. 모든 UI 컴포넌트와 페이지는 이 가이드를 따라 구현되어야 합니다.

## 지원 해상도

### 브레이크포인트 정의

| 범위 | 이름 | Tailwind Prefix | 설명 |
|------|------|-----------------|------|
| ≤639px | Mobile Small | (default) | 최소 지원 해상도 (360px) |
| 640px+ | Small | `sm:` | 큰 모바일 기기 |
| 768px+ | Medium | `md:` | 태블릿 세로 |
| 1024px+ | Large | `lg:` | 태블릿 가로, 작은 데스크톱 |
| 1280px+ | XLarge | `xl:` | 데스크톱 |
| 1536px+ | 2XLarge | `2xl:` | 큰 데스크톱 |

### Mobile-First 접근

기본 스타일은 모바일을 기준으로 작성하고, 브레이크포인트를 통해 큰 화면에 맞게 조정합니다.

```jsx
// ❌ Desktop-First (지양)
<div className="text-xl md:text-base">

// ✅ Mobile-First (권장)
<div className="text-base md:text-xl">
```

## 그리드 시스템

### 컨테이너

```jsx
// 최대 너비 제한이 있는 컨테이너
<div className="container mx-auto px-4 md:px-6 lg:px-8">

// 전체 너비 컨테이너
<div className="w-full px-4 md:px-6 lg:px-8">

// 좁은 콘텐츠 영역 (폼, 기사 등)
<div className="max-w-2xl mx-auto px-4 md:px-6">

// 넓은 콘텐츠 영역 (대시보드 등)
<div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
```

### 카드 그리드

```jsx
// 투표 카드 리스트 (모바일 1열, 태블릿 2열, 데스크톱 3열)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">

// 투표 옵션 (2-way: 모바일 1열, 데스크톱 2열)
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

// 투표 옵션 (3-way: 모바일 1열, 태블릿 2열, 데스크톱 3열)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
```

## 타이포그래피

### 제목 (Headings)

```jsx
// H1 - 페이지 메인 제목
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">

// H2 - 섹션 제목
<h2 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight">

// H3 - 서브섹션 제목
<h3 className="text-lg md:text-xl lg:text-2xl font-semibold">

// H4 - 카드 제목
<h4 className="text-base md:text-lg font-semibold">
```

### 본문 (Body Text)

```jsx
// 기본 본문
<p className="text-sm md:text-base text-text-secondary">

// 작은 텍스트 (메타 정보, 캡션)
<p className="text-xs md:text-sm text-text-tertiary">

// 큰 본문 (리드 텍스트)
<p className="text-base md:text-lg text-text-secondary">
```

### 버튼 텍스트

```jsx
// 기본 버튼
<button className="text-sm md:text-base font-semibold">

// 작은 버튼
<button className="text-xs md:text-sm font-semibold">

// 큰 버튼 (CTA)
<button className="text-base md:text-lg font-semibold">
```

## 간격 시스템

### 패딩 (Padding)

```jsx
// 컨테이너 패딩
className="p-4 md:p-6 lg:p-8"

// 카드 패딩
className="p-4 md:p-6"

// 섹션 패딩 (수직)
className="py-6 md:py-8 lg:py-12"

// 버튼 패딩
className="px-4 py-2 md:px-6 md:py-3"
```

### 마진 (Margin)

```jsx
// 섹션 간격
className="my-8 md:my-12 lg:my-16"

// 요소 간격
className="mb-4 md:mb-6 lg:mb-8"

// 작은 간격
className="mb-2 md:mb-3"
```

### 스택 간격 (Space)

```jsx
// 수평 스택
className="flex space-x-2 md:space-x-4"

// 수직 스택
className="flex flex-col space-y-3 md:space-y-4 lg:space-y-6"
```

## 컴포넌트별 패턴

### Navbar

```jsx
<nav className="p-4">
  {/* 로고 */}
  <div className="text-xl md:text-2xl lg:text-3xl font-bold">

  {/* 네비게이션 링크 */}
  <Link className="text-xs md:text-sm lg:text-base">

  {/* 버튼 */}
  <Button className="text-xs md:text-sm px-2 md:px-4 py-1 md:py-2">

  {/* 모바일에서 숨김 */}
  <span className="hidden sm:block">
</nav>
```

### 투표 카드 (Featured Poll)

```jsx
<div className="bg-panel rounded-lg overflow-hidden">
  {/* 헤더 */}
  <div className="p-4 md:p-6">
    <h3 className="text-xl md:text-2xl font-bold">
  </div>

  {/* 옵션 그리드 */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
    {/* 옵션 이미지 */}
    <div className="h-40 md:h-48 lg:h-56 rounded-lg overflow-hidden">

    {/* 옵션 제목 */}
    <h4 className="text-base md:text-lg font-semibold">
  </div>

  {/* 하단 액션 */}
  <div className="p-4 md:p-6">
    <button className="text-sm md:text-base py-2 md:py-3 px-4 md:px-6">
  </div>
</div>
```

### 투표 목록 카드

```jsx
<div className="bg-panel rounded-lg">
  <div className="p-4 md:p-6">
    {/* 제목 */}
    <h3 className="text-lg md:text-xl font-semibold">

    {/* 옵션 리스트 */}
    <div className="space-y-2 md:space-y-3">
      <div className="p-3 md:p-4">
        {/* 옵션 이미지 (모바일에서 더 작게) */}
        <div className="w-10 h-10 md:w-12 md:h-12">

        {/* 옵션 텍스트 */}
        <span className="text-sm md:text-base">
      </div>
    </div>

    {/* 버튼 영역 (모바일에서 세로 배치 가능) */}
    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
  </div>
</div>
```

### 폼 (투표 생성)

```jsx
<form className="max-w-2xl mx-auto p-4 md:p-6 lg:p-8">
  {/* 입력 필드 */}
  <div className="mb-4 md:mb-6">
    <label className="text-sm md:text-base">
    <input className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base">
  </div>

  {/* 시간 프리셋 버튼 (2행 레이아웃) */}
  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
    <button className="text-xs md:text-sm py-2 px-2">
  </div>

  {/* 제출 버튼 */}
  <button className="w-full sm:w-auto text-sm md:text-base py-2 md:py-3 px-6 md:px-8">
</form>
```

## 이미지 반응형

### Next.js Image 컴포넌트

```jsx
// 고정 비율 이미지
<div className="relative w-full h-40 md:h-48 lg:h-56">
  <Image
    src={imageUrl}
    alt={alt}
    fill
    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
    style={{ objectFit: 'cover' }}
  />
</div>

// 작은 아이콘/썸네일
<div className="relative w-10 h-10 md:w-12 md:h-12">
  <Image
    src={imageUrl}
    alt={alt}
    fill
    sizes="48px"
    style={{ objectFit: 'cover' }}
  />
</div>
```

## 접근성 (Accessibility)

### 터치 영역

모바일 버튼 최소 크기: **44x44px**

```jsx
// ✅ 충분한 터치 영역
<button className="min-h-[44px] min-w-[44px] p-3">

// ❌ 너무 작은 터치 영역
<button className="p-1">
```

### 키보드 네비게이션

```jsx
// 포커스 가능한 요소에 포커스 스타일 추가
<button className="focus:outline-none focus:ring-2 focus:ring-primary">

// 클릭 가능한 div는 지양, button 사용
// ❌
<div onClick={handleClick}>
// ✅
<button onClick={handleClick}>
```

### 스크린 리더

```jsx
// 아이콘 버튼에 레이블 추가
<button aria-label="즐겨찾기에 추가">
  <HeartIcon />
</button>

// 이미지에 의미있는 alt 텍스트
<Image src={url} alt="아이유 vs 태연 투표 옵션" />
```

## 숨김/표시 유틸리티

```jsx
// 모바일에서만 표시
<div className="block md:hidden">

// 데스크톱에서만 표시
<div className="hidden md:block">

// 태블릿 이상에서만 표시
<div className="hidden sm:block">
```

## 반응형 레이아웃 방향

```jsx
// 모바일: 세로, 데스크톱: 가로
<div className="flex flex-col md:flex-row">

// 모바일: 가로, 데스크톱: 세로
<div className="flex flex-row md:flex-col">
```

## 테스트 체크리스트

모든 페이지와 컴포넌트는 다음 해상도에서 테스트되어야 합니다:

- [ ] 360px (Mobile Small)
- [ ] 640px (Mobile Large)
- [ ] 768px (Tablet Portrait)
- [ ] 1024px (Tablet Landscape)
- [ ] 1280px (Desktop)
- [ ] 1920px (Large Desktop)

### 테스트 항목

- [ ] 텍스트가 잘리지 않고 읽기 쉬운가?
- [ ] 버튼과 링크가 모바일에서 쉽게 클릭/탭 가능한가?
- [ ] 이미지가 왜곡되지 않고 적절히 표시되는가?
- [ ] 양옆 여백이 충분한가?
- [ ] 스크롤이 정상적으로 작동하는가?
- [ ] 모든 기능에 접근 가능한가?

## 참고 자료

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
