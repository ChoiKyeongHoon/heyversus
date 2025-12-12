```mermaid
graph TD
    subgraph "사용자"
        A[사용자 브라우저<br/>React 19 클라이언트]
    end

    subgraph "프론트엔드 (Vercel)"
        B[Next.js 15 App Router]
        B --> C[Server Components<br/>Route Handlers · ISR · Tags]
        B --> D[Client Components<br/>React Query · Zustand]
        D --> E[Sonner Toast · next-themes]
        B --> F[Sentry Instrumentation Hook<br/>(instrumentation.ts)]
    end

    subgraph "Supabase BaaS"
        G[Supabase 프로젝트]
        G --> H[Auth · Session]
        G --> I[PostgreSQL]
        G --> J[Edge Functions]
        G --> K[Storage (avatars, poll_images 버킷)]
    end

    subgraph "데이터 계층 로직"
        I --> L[RLS Policies<br/>(공개/비공개 접근 제어)]
        I --> M[RPC Functions<br/>(get_polls_paginated 등)]
        I --> N[Materialized Views & 인덱스]
    end

    A -- HTTPS --> B
    C -. server Supabase Client .-> G
    D -. client Supabase Client .-> G
    F --> O[Sentry SaaS]

    style G fill:#3ecf8e,stroke:#0b3d2e,stroke-width:2px,color:#fff
    style O fill:#ff5500,stroke:#8a2d00,stroke-width:1.5px,color:#fff
```
