"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Profile 타입 정의
 */
export interface Profile {
  id: string;
  username: string;
  email?: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  points: number;
  created_at: string;
  updated_at: string;
}

/**
 * Profile 업데이트 요청 타입
 */
export interface UpdateProfileRequest {
  username?: string;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
}

/**
 * 현재 로그인한 사용자의 프로필 조회
 */
export async function getCurrentProfile(): Promise<{
  data: Profile | null;
  error: Error | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        data: null,
        error: new Error("Not authenticated"),
      };
    }

    // RPC 함수 호출
    const { data, error } = await supabase.rpc("get_profile");

    if (error) {
      console.error("Error fetching profile:", error);
      return {
        data: null,
        error: new Error(error.message),
      };
    }

    return {
      data: data as Profile,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error fetching profile:", error);
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error("Failed to fetch profile"),
    };
  }
}

/**
 * 특정 사용자의 프로필 조회 (공개 정보만)
 */
export async function getProfileById(
  userId: string
): Promise<{
  data: Profile | null;
  error: Error | null;
}> {
  try {
    const supabase = await createClient();

    // RPC 함수 호출
    const { data, error } = await supabase.rpc("get_profile", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching profile by ID:", error);
      return {
        data: null,
        error: new Error(error.message),
      };
    }

    return {
      data: data as Profile,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error fetching profile by ID:", error);
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error("Failed to fetch profile"),
    };
  }
}

/**
 * 프로필 업데이트
 */
export async function updateProfile(
  updates: UpdateProfileRequest
): Promise<{
  data: Profile | null;
  error: Error | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        data: null,
        error: new Error("Not authenticated"),
      };
    }

    // RPC 함수 호출
    const { data, error } = await supabase.rpc("update_profile", {
      p_username: updates.username,
      p_full_name: updates.full_name,
      p_bio: updates.bio,
      p_avatar_url: updates.avatar_url,
    });

    if (error) {
      console.error("Error updating profile:", error);
      return {
        data: null,
        error: new Error(error.message),
      };
    }

    return {
      data: data as Profile,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error updating profile:", error);
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error("Failed to update profile"),
    };
  }
}

/**
 * 아바타 이미지 업로드
 */
export async function uploadAvatar(
  file: File
): Promise<{
  data: { url: string; path: string } | null;
  error: Error | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        data: null,
        error: new Error("Not authenticated"),
      };
    }

    // 파일 검증
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        data: null,
        error: new Error("File size must be less than 5MB"),
      };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return {
        data: null,
        error: new Error("Only JPEG, PNG, GIF, and WebP images are allowed"),
      };
    }

    // 파일명 생성: userId/timestamp-filename
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${session.user.id}/${timestamp}.${fileExt}`;

    // Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      return {
        data: null,
        error: new Error(uploadError.message),
      };
    }

    // Public URL 가져오기
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(uploadData.path);

    return {
      data: {
        url: publicUrl,
        path: uploadData.path,
      },
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error uploading avatar:", error);
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error("Failed to upload avatar"),
    };
  }
}

/**
 * 이전 아바타 이미지 삭제
 */
export async function deleteAvatar(
  avatarPath: string
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: new Error("Not authenticated"),
      };
    }

    // avatarPath에서 파일 경로만 추출 (URL인 경우)
    const path = avatarPath.includes("/storage/v1/object/public/avatars/")
      ? avatarPath.split("/storage/v1/object/public/avatars/")[1]
      : avatarPath;

    const { error } = await supabase.storage.from("avatars").remove([path]);

    if (error) {
      console.error("Error deleting avatar:", error);
      return {
        success: false,
        error: new Error(error.message),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("Unexpected error deleting avatar:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error : new Error("Failed to delete avatar"),
    };
  }
}
