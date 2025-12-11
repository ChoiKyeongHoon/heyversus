# HeyVersus Design System

HeyVersus의 통일된 디자인 언어와 UI 시스템 가이드입니다.

## 브랜드 정체성

### 키워드
- **역동적 (Dynamic)**: 빠르게 변화하는 투표 결과와 실시간 참여
- **대비되는 (Contrasting)**: "A vs B" 구조의 명확한 선택
- **활기찬 (Vibrant)**: 참여를 유도하는 생동감 있는 색상

### 톤 앤 매너
- 재미있고 참여형 (Fun & Engaging)
- 경쟁적이지만 친근한 (Competitive yet Friendly)
- 직관적이고 명확한 (Intuitive & Clear)

## 색상 시스템

### 브랜드 색상

HeyVersus의 핵심 브랜드 색상은 Gold와 Orange입니다.

```css
--brand-gold: #FFD700 (HSL: 45 100% 50%)
--brand-orange: #FF8C00 (HSL: 29 100% 50%)
```

사용 예시:
- 로고: "Hey" (Gold) + "Versus" (Orange)
- 포인트/보상: Gold
- 주요 액션 버튼: Orange (Primary)

### 의미론적 색상 (Semantic Colors)

모든 색상은 라이트/다크 모드를 지원하며 CSS 변수로 관리됩니다.

#### 라이트 모드

| 변수명 | 용도 | 색상 |
|--------|------|------|
| `--background` | 페이지 배경 | White (0 0% 100%) |
| `--foreground` | 주요 텍스트 | Dark Gray (240 10% 3.9%) |
| `--card` | 카드 배경 | White (0 0% 100%) |
| `--primary` | 주요 액션 | Orange (29 100% 50%) |
| `--accent` | 강조 요소 | Gold (45 100% 50%) |
| `--muted` | 보조 배경 | Light Gray (240 4.8% 95.9%) |
| `--border` | 테두리 | Light Gray (240 5.9% 90%) |

#### 다크 모드

| 변수명 | 용도 | 색상 |
|--------|------|------|
| `--background` | 페이지 배경 | Very Dark (0 0% 9%) |
| `--foreground` | 주요 텍스트 | Almost White (0 0% 98%) |
| `--card` | 카드 배경 | Dark Gray (0 0% 9.5%) |
| `--primary` | 주요 액션 | Lighter Orange (29 100% 60%) |
| `--accent` | 강조 요소 | Lighter Gold (45 100% 60%) |
| `--muted` | 보조 배경 | Dark Gray (0 0% 14.9%) |
| `--border` | 테두리 | Dark Gray (0 0% 14.9%) |

### 확장 의미 색상

상태와 피드백을 표현하는 색상들:

- **Success**: 초록색 (147 78% 44% / 50%)
- **Warning**: 노란색 (38 92% 55% / 60%)
- **Info**: 파란색 (214 95% 60% / 65%)
- **Destructive**: 빨간색 (0 84.2% 60.2% / 0 62.8% 50.6%)

## 타이포그래피

### 폰트 패밀리

```css
font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...
```

- 주 폰트: **Inter** (Google Fonts)
- 폴백: System UI 폰트 스택

### 폰트 크기 스케일

Tailwind CSS 기본 스케일 사용:

| 클래스 | 크기 | 사용 예시 |
|--------|------|-----------|
| `text-xs` | 0.75rem | 캡션, 메타 정보 |
| `text-sm` | 0.875rem | 본문 보조 |
| `text-base` | 1rem | 기본 본문 |
| `text-lg` | 1.125rem | 강조 텍스트 |
| `text-xl` | 1.25rem | 작은 제목 |
| `text-2xl` | 1.5rem | 중간 제목 |
| `text-3xl` | 1.875rem | 큰 제목 |
| `text-4xl` | 2.25rem | 메인 제목 |

### 반응형 타이포그래피

모바일-퍼스트 접근으로 화면 크기별 조정:

```jsx
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  제목
</h1>
```

## 간격 시스템

Tailwind CSS 기본 간격 시스템 (4px 단위) 사용:

| 값 | 픽셀 | 사용 예시 |
|----|------|-----------|
| 1 | 4px | 최소 간격 |
| 2 | 8px | 작은 간격 |
| 3 | 12px | 기본 간격 |
| 4 | 16px | 일반 간격 |
| 6 | 24px | 중간 간격 |
| 8 | 32px | 큰 간격 |
| 12 | 48px | 섹션 간격 |

### 반응형 간격

```jsx
<div className="p-4 md:p-6 lg:p-8">
  <!-- 모바일: 16px, 태블릿: 24px, 데스크톱: 32px -->
</div>
```

## Border Radius

| 클래스 | 크기 | 사용 예시 |
|--------|------|-----------|
| `rounded-sm` | 0.25rem | 작은 요소 |
| `rounded-md` | 0.5rem | 기본 버튼, 입력 |
| `rounded-lg` | 0.75rem | 카드 |
| `rounded-xl` | 1rem | 큰 카드 |
| `rounded-2xl` | 1.25rem | 특별한 요소 |
| `rounded-full` | 9999px | 배지, 아바타 |

## 그림자 (Shadows)

| 클래스 | 사용 예시 |
|--------|-----------|
| `shadow-sm` | 미묘한 깊이 (입력 필드) |
| `shadow-md` | 중간 깊이 (버튼) |
| `shadow-lg` | 뚜렷한 깊이 (카드) |
| `shadow-xl` | 강한 깊이 (모달) |
| `shadow-2xl` | 최대 깊이 (드롭다운) |

## 컴포넌트

### Button

variant 종류:
- `default`: 주요 액션 (Primary Orange)
- `secondary`: 보조 액션
- `destructive`: 삭제/취소
- `success`: 성공/확인 (Success Green)
- `outline`: 아웃라인
- `ghost`: 텍스트 버튼
- `link`: 링크 스타일

size 종류:
- `sm`: 작은 버튼 (h-9)
- `default`: 기본 버튼 (h-10)
- `lg`: 큰 버튼 (h-11)
- `icon`: 아이콘 전용 (10x10)

```jsx
<Button variant="default" size="lg">
  투표하기
</Button>
```

### Badge

variant 종류:
- `default`: 기본 배지
- `secondary`: 보조 배지
- `success`: 성공 상태
- `warning`: 경고 상태
- `info`: 정보 표시
- `destructive`: 에러/삭제
- `outline`: 아웃라인

```jsx
<Badge variant="success">완료</Badge>
```

### Card

구조:
- `Card`: 컨테이너
- `CardHeader`: 헤더 영역
- `CardTitle`: 제목
- `CardDescription`: 설명
- `CardContent`: 본문
- `CardFooter`: 푸터/액션

```jsx
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>본문</CardContent>
  <CardFooter>액션</CardFooter>
</Card>
```

### Input

통일된 입력 필드 스타일:

```jsx
<Input
  type="text"
  placeholder="투표 제목을 입력하세요"
/>
```

## 다크 모드

### 설정

`next-themes`를 사용한 테마 전환:

```jsx
import { ThemeProvider } from "@/components/theme-provider"

<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

### 테마 토글

`ThemeToggle` 컴포넌트를 사용하여 라이트/다크 모드 전환:

```jsx
import { ThemeToggle } from "@/components/theme-toggle"

<ThemeToggle />
```

## 애니메이션

### 내장 애니메이션

| 애니메이션 | 설명 |
|-----------|------|
| `animate-fade-in` | 페이드 인 (0.3s) |
| `animate-slide-in` | 아래에서 슬라이드 (0.4s) |
| `animate-accordion-down` | 아코디언 열기 |
| `animate-accordion-up` | 아코디언 닫기 |

### Transition

모든 인터랙티브 요소에 `transition-colors` 적용:

```jsx
<button className="... transition-colors">
  버튼
</button>
```

## 접근성 (Accessibility)

### 터치 타겟

모든 인터랙티브 요소는 최소 44x44px:

```jsx
<button className="min-h-[44px]">
  버튼
</button>
```

### 포커스 스타일

모든 포커스 가능한 요소에 명확한 링 표시:

```jsx
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ring
focus-visible:ring-offset-2
```

### 스크린 리더

숨겨진 텍스트로 의미 전달:

```jsx
<span className="sr-only">Toggle theme</span>
```

## 반응형 디자인

### 브레이크포인트 & 명명 규칙

| 범위 | 이름 | Tailwind Prefix | 설명 |
|------|------|-----------------|------|
| ≤639px | Mobile Small | (default) | 최소 지원 해상도 (360px) |
| ≥640px | Small | `sm:` | 큰 모바일 기기 |
| ≥768px | Medium | `md:` | 태블릿 세로 |
| ≥1024px | Large | `lg:` | 태블릿 가로 · 작은 데스크톱 |
| ≥1280px | XLarge | `xl:` | 표준 데스크톱 |
| ≥1536px | 2XLarge | `2xl:` | 대형 데스크톱 |

모든 스타일은 모바일을 기준으로 작성하고 상위 해상도에서 확장합니다.

```jsx
// Mobile-first
<div className="text-base md:text-xl lg:text-2xl">
  컨텐츠
</div>
```

### 컨테이너 & 레이아웃

| 패턴 | 클래스 | 용도 |
|-------|--------|------|
| 기본 컨테이너 | `container mx-auto px-4 md:px-6 lg:px-8` | 페이지 전역 레이아웃 |
| 전체 폭 | `w-full px-4 md:px-6 lg:px-8` | 히어로, 배너 |
| 좁은 영역 | `max-w-2xl mx-auto px-4 md:px-6` | 폼, 글 콘텐츠 |
| 넓은 영역 | `max-w-4xl mx-auto px-4 md:px-6 lg:px-8` | 대시보드, 리스트 |

```jsx
<section className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
  ...
</section>
```

### 카드 & 옵션 그리드

```jsx
// 투표 카드 (모바일 1열 → 데스크톱 3열)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8" />

// 2-way 옵션 (모바일 1열 → 데스크톱 2열)
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8" />

// 3-way 옵션 (모바일 1열 → 태블릿 2열 → 데스크톱 3열)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" />
```

### 반응형 타이포그래피 패턴

```jsx
// 페이지 메인 제목
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight" />

// 섹션 제목
<h2 className="text-xl md:text-2xl lg:text-3xl font-semibold" />

// 본문 텍스트
<p className="text-sm md:text-base text-text-secondary" />

// 캡션/메타
<p className="text-xs md:text-sm text-text-tertiary" />
```

### 간격 시스템 (Spacing)

```jsx
// 패딩
className="p-4 md:p-6 lg:p-8"

// 섹션 여백
className="my-8 md:my-12 lg:my-16"

// 요소 간격
className="mb-4 md:mb-6 lg:mb-8"

// 수평/수직 스택
className="flex space-x-2 md:space-x-4"
className="flex flex-col space-y-3 md:space-y-4 lg:space-y-6"
```

### 컴포넌트 레이아웃 예시

```jsx
// Navbar
<nav className="p-4 flex items-center justify-between">
  <div className="text-xl md:text-2xl lg:text-3xl font-bold">HeyVersus</div>
  <div className="hidden md:flex gap-4 text-sm md:text-base">
    <Link href="/polls">투표</Link>
    <Link href="/favorites">즐겨찾기</Link>
  </div>
  <Button size="sm" className="md:h-10">CTA</Button>
</nav>

// 메인 컨텐츠 섹션
<section className="w-full px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-12">
  <div className="grid gap-6 md:grid-cols-2">
    ...
  </div>
</section>
```

## 사용 가이드

### Tailwind 클래스 사용

1. **디자인 토큰 우선**: 하드코딩 색상 대신 토큰 사용
   ```jsx
   ❌ className="text-gray-300"
   ✅ className="text-muted-foreground"
   ```

2. **의미론적 클래스**: 용도에 맞는 클래스 선택
   ```jsx
   ❌ className="bg-yellow-500"
   ✅ className="bg-accent"  // 강조용 Gold
   ```

3. **반응형 우선**: 모바일부터 설계
   ```jsx
   ✅ className="text-sm md:text-base lg:text-lg"
   ```

### 컴포넌트 조합

재사용 가능한 UI 컴포넌트를 활용:

```jsx
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

<Card>
  <CardContent>
    <Button variant="default">투표하기</Button>
  </CardContent>
</Card>
```

## 참고 문서

- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [next-themes](https://github.com/pacocoursey/next-themes)
