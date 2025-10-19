"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Save, Upload, User, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Profile } from "@/lib/services/profile";
import { deleteAvatar, updateProfile, uploadAvatar } from "@/lib/services/profile";

// Zod 스키마 정의
const profileSchema = z.object({
  username: z
    .string()
    .min(3, "사용자명은 최소 3자 이상이어야 합니다")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "사용자명은 영문, 숫자, _, - 만 사용 가능합니다"
    ),
  full_name: z.string().max(50, "이름은 최대 50자까지 가능합니다").optional(),
  bio: z.string().max(500, "소개는 최대 500자까지 가능합니다").optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface AccountClientProps {
  initialProfile: Profile;
}

export default function AccountClient({ initialProfile }: AccountClientProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile.username,
      full_name: profile.full_name || "",
      bio: profile.bio || "",
    },
  });

  // 편집 모드 토글
  const handleEditToggle = () => {
    if (isEditing) {
      // 취소 시 폼 리셋
      reset({
        username: profile.username,
        full_name: profile.full_name || "",
        bio: profile.bio || "",
      });
      setAvatarPreview(null);
      setSelectedFile(null);
      setError(null);
    }
    setIsEditing(!isEditing);
  };

  // 아바타 파일 선택 핸들러
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("JPEG, PNG, GIF, WebP 이미지만 업로드 가능합니다.");
      return;
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 프로필 업데이트 제출
  const onSubmit = async (data: ProfileFormData) => {
    try {
      setError(null);
      let newAvatarUrl = profile.avatar_url;

      // 1. 새 아바타가 선택된 경우 업로드
      if (selectedFile) {
        setIsUploading(true);

        // 기존 아바타 삭제 (있는 경우)
        if (profile.avatar_url) {
          await deleteAvatar(profile.avatar_url);
        }

        // 새 아바타 업로드
        const { data: uploadData, error: uploadError } =
          await uploadAvatar(selectedFile);

        if (uploadError || !uploadData) {
          setError(uploadError?.message || "아바타 업로드에 실패했습니다.");
          setIsUploading(false);
          return;
        }

        newAvatarUrl = uploadData.url;
        setIsUploading(false);
      }

      // 2. 프로필 정보 업데이트
      const { data: updatedProfile, error: updateError } = await updateProfile({
        username: data.username,
        full_name: data.full_name || null,
        bio: data.bio || null,
        avatar_url: newAvatarUrl,
      });

      if (updateError || !updatedProfile) {
        setError(updateError?.message || "프로필 업데이트에 실패했습니다.");
        return;
      }

      // 3. 상태 업데이트
      setProfile(updatedProfile);
      setIsEditing(false);
      setAvatarPreview(null);
      setSelectedFile(null);

      // 4. 페이지 새로고침하여 서버 데이터 동기화
      router.refresh();
    } catch (err) {
      console.error("Profile update error:", err);
      setError("프로필 업데이트 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-orange to-brand-gold bg-clip-text text-transparent">
          내 프로필
        </h1>
        <Button
          variant={isEditing ? "outline" : "default"}
          onClick={handleEditToggle}
          disabled={isSubmitting || isUploading}
        >
          {isEditing ? (
            <>
              <X className="mr-2 h-4 w-4" />
              취소
            </>
          ) : (
            <>
              <Pencil className="mr-2 h-4 w-4" />
              편집
            </>
          )}
        </Button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 프로필 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>
              프로필 사진과 기본 정보를 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 아바타 섹션 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* 아바타 이미지 */}
              <div className="relative">
                {avatarPreview || profile.avatar_url ? (
                  <Image
                    src={avatarPreview || profile.avatar_url || ""}
                    alt="프로필 이미지"
                    width={120}
                    height={120}
                    className="rounded-full object-cover border-4 border-border"
                  />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full bg-muted flex items-center justify-center border-4 border-border">
                    <User className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                {isEditing && (
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-all shadow-lg"
                  >
                    <Upload className="w-4 h-4" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* 아바타 정보 */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">
                  {profile.username}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {profile.email}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {profile.points} 포인트
                </Badge>
                {isEditing && (
                  <p className="text-xs text-muted-foreground mt-3">
                    프로필 사진을 변경하려면 위 아이콘을 클릭하세요
                    <br />
                    (최대 5MB, JPEG/PNG/GIF/WebP)
                  </p>
                )}
              </div>
            </div>

            {/* 사용자명 */}
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-sm font-medium leading-none"
              >
                사용자명 *
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="username"
                    {...register("username")}
                    placeholder="사용자명을 입력하세요"
                    disabled={isSubmitting || isUploading}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive">
                      {errors.username.message}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-base py-2">{profile.username}</p>
              )}
            </div>

            {/* 이름 */}
            <div className="space-y-2">
              <label
                htmlFor="full_name"
                className="text-sm font-medium leading-none"
              >
                이름
              </label>
              {isEditing ? (
                <>
                  <Input
                    id="full_name"
                    {...register("full_name")}
                    placeholder="이름을 입력하세요 (선택)"
                    disabled={isSubmitting || isUploading}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">
                      {errors.full_name.message}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-base py-2">
                  {profile.full_name || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </p>
              )}
            </div>

            {/* 소개 */}
            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-medium leading-none">
                소개
              </label>
              {isEditing ? (
                <>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    placeholder="자기소개를 입력하세요 (선택, 최대 500자)"
                    rows={4}
                    disabled={isSubmitting || isUploading}
                    className="resize-none"
                  />
                  {errors.bio && (
                    <p className="text-sm text-destructive">
                      {errors.bio.message}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-base py-2 whitespace-pre-wrap">
                  {profile.bio || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 계정 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>계정 정보</CardTitle>
            <CardDescription>읽기 전용 계정 정보입니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  이메일
                </label>
                <p className="text-base mt-1">{profile.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  포인트
                </label>
                <p className="text-base mt-1">{profile.points}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  가입일
                </label>
                <p className="text-base mt-1">
                  {new Date(profile.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  최종 수정일
                </label>
                <p className="text-base mt-1">
                  {new Date(profile.updated_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 저장 버튼 (편집 모드일 때만 표시) */}
        {isEditing && (
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleEditToggle}
              disabled={isSubmitting || isUploading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading}
              variant="success"
            >
              {isSubmitting || isUploading ? (
                <>저장 중...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  저장
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
