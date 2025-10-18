import { create } from "zustand";

interface UIStore {
  // 모달 상태
  isModalOpen: boolean;
  modalContent: React.ReactNode | null;
  openModal: (_content: React.ReactNode) => void;
  closeModal: () => void;

  // 사이드바 상태 (모바일)
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isModalOpen: false,
  modalContent: null,
  openModal: (content) => set({ isModalOpen: true, modalContent: content }),
  closeModal: () => set({ isModalOpen: false, modalContent: null }),

  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
}));
