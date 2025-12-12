```mermaid
graph TD
    %% 인증 흐름
    subgraph "인증 (Supabase Auth)"
        Auth_SignIn["/signin"]
        Auth_SignUp["/signup"]
        Auth_Process[Supabase 인증 처리]
        Auth_Redirect["/ (홈)"]

        Auth_SignIn --> Auth_Process
        Auth_SignUp --> Auth_Process
        Auth_Process -- 성공 --> Auth_Redirect
    end

    %% 투표 생성
    subgraph "투표 생성"
        Create_Entry["/create-poll"]
        Create_Check{로그인 여부}
        Create_Form[질문 · 선택지 입력<br/>만료 시간 설정<br/>(선택지 이미지 선택 옵션)]
        Create_Image[선택지 이미지 업로드(옵션)<br/>poll_images 서명 URL]
        Create_Save["create_new_poll RPC 호출"]
        Create_Detail["/poll/[id] 상세 페이지"]

        Create_Entry --> Create_Check
        Create_Check -- No --> Auth_SignIn
        Create_Check -- Yes --> Create_Form
        Create_Form -- 생성하기 --> Create_Image
        Create_Image --> Create_Save
        Create_Save --> Create_Detail
    end

    %% 투표 참여
    subgraph "투표 참여 & 결과"
        Vote_Page["/poll/[id] 진입"]
        Vote_Fetch["get_poll_with_user_status RPC"]
        Vote_Session{로그인 상태?}
        Vote_Duplicate_Login{이미 투표했는가?}
        Vote_Duplicate_Guest{localStorage 기록 존재?}
        Vote_Submit["increment_vote RPC"]
        Vote_Store["React Query 캐시 패치<br/>+ invalidateQueries"]
        Vote_View["최신 결과 렌더링"]

        Vote_Page --> Vote_Fetch
        Vote_Fetch --> Vote_Session
        Vote_Session -- Yes --> Vote_Duplicate_Login
        Vote_Duplicate_Login -- No --> Vote_Submit
        Vote_Submit --> Vote_Store --> Vote_View
        Vote_Duplicate_Login -- Yes --> Vote_View
        Vote_Session -- No --> Vote_Duplicate_Guest
        Vote_Duplicate_Guest -- No --> Vote_Submit
        Vote_Duplicate_Guest -- Yes --> Vote_View
    end

    %% 즐겨찾기
    subgraph "즐겨찾기 관리"
        Fav_Entry["/favorites"]
        Fav_Check{로그인 여부}
        Fav_Fetch["get_favorite_polls RPC"]
        Fav_Toggle["toggle_favorite RPC"]
        Fav_Update["React Query 상태 동기화"]

        Fav_Entry --> Fav_Check
        Fav_Check -- No --> Auth_SignIn
        Fav_Check -- Yes --> Fav_Fetch
        Fav_Fetch --> Fav_Toggle
        Fav_Toggle --> Fav_Update --> Fav_Fetch
    end

    %% 프로필/계정
    subgraph "계정 · 프로필 관리"
        Account_Entry["/account"]
        Account_Check{로그인 여부}
        Account_Fetch["get_profile RPC"]
        Account_Form["React Hook Form + Zod 검증"]
        Account_Update["update_profile RPC"]
        Account_Avatar["Storage avatars 버킷"]
        Account_Success["Navbar·UI 동기화"]

        Account_Entry --> Account_Check
        Account_Check -- No --> Auth_SignIn
        Account_Check -- Yes --> Account_Fetch
        Account_Fetch --> Account_Form
        Account_Form --> Account_Update --> Account_Success
        Account_Form --> Account_Avatar
    end

    %% 홈 · 탐색 흐름
    Home["/ (대표 투표)"] --> Action{사용자 행동 선택}
    Action -- 전체 투표 보기 --> Polls["/polls (무한 스크롤)"]
    Action -- 투표 생성 --> Create_Entry
    Action -- 로그인 --> Auth_SignIn
    Action -- 회원가입 --> Auth_SignUp
    Action -- 즐겨찾기 --> Fav_Entry
    Action -- 프로필 관리 --> Account_Entry
    Action -- 특정 투표 선택 --> Vote_Page
    Polls --> Vote_Page
    Home --> Vote_Page
```
