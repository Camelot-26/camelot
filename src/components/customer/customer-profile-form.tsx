"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  changeCustomerPassword,
  updateCustomerProfile,
} from "@/app/(customer)/customer/profile/actions";

export function CustomerProfileForm({
  email,
  image,
  name,
  phone,
}: {
  email: string;
  image: string | null;
  name: string;
  phone: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState(image ?? "");
  const [uploadedProfileImage, setUploadedProfileImage] = useState("");
  const [imageChanged, setImageChanged] = useState(false);
  const [readingImage, setReadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const imageReaderRef = useRef<FileReader | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readingImage) return;
    setSaving(true);
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);
    try {
      const result = await updateCustomerProfile({
        name: formData.get("name"),
        phone: formData.get("phone"),
        ...(imageChanged ? { image: uploadedProfileImage } : {}),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }

      setMessage("Your profile has been updated.");
      setImageChanged(false);
      router.refresh();
    } catch {
      setError("Your profile could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    imageReaderRef.current?.abort();
    imageReaderRef.current = null;
    setReadingImage(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPEG, or WebP image.");
      input.value = "";
      return;
    }
    if (file.size > 512 * 1024) {
      setError("Choose an image smaller than 512 KB.");
      input.value = "";
      return;
    }

    setReadingImage(true);
    setError("");
    const reader = new FileReader();
    imageReaderRef.current = reader;
    reader.onload = () => {
      if (imageReaderRef.current !== reader) return;
      imageReaderRef.current = null;
      setReadingImage(false);
      if (typeof reader.result !== "string") {
        setError("We couldn’t read that image. Please try another file.");
        return;
      }

      setUploadedProfileImage(reader.result);
      setProfileImagePreview(reader.result);
      setImageChanged(true);
    };
    reader.onerror = () => {
      if (imageReaderRef.current !== reader) return;
      imageReaderRef.current = null;
      setReadingImage(false);
      setError("We couldn’t read that image. Please try another file.");
    };
    reader.onabort = () => {
      if (imageReaderRef.current !== reader) return;
      imageReaderRef.current = null;
      setReadingImage(false);
    };
    reader.readAsDataURL(file);
  }

  function removeProfileImage() {
    imageReaderRef.current?.abort();
    imageReaderRef.current = null;
    setReadingImage(false);
    setProfileImagePreview("");
    setUploadedProfileImage("");
    setImageChanged(true);
    setError("");
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage("");
    setPasswordError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      setPasswordSaving(false);
      return;
    }

    try {
      const result = await changeCustomerPassword(
        currentPassword,
        newPassword,
      );
      if (!result.success) {
        setPasswordError(result.message);
        return;
      }

      form.reset();
      setPasswordMessage(
        "Your password has been changed. Other signed-in sessions were signed out.",
      );
      router.refresh();
    } catch {
      setPasswordError("Your password could not be changed. Please try again.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <>
      <section
        aria-labelledby="customer-profile-title"
        className="customer-profile-card"
      >
        <div className="customer-profile-heading">
          <span className="customer-profile-avatar">
            {profileImagePreview ? (
              <Image
                alt="Profile image"
                height={62}
                src={profileImagePreview}
                unoptimized
                width={62}
              />
            ) : (
              <span aria-hidden="true">
                {name.trim().slice(0, 1).toUpperCase() || "C"}
              </span>
            )}
          </span>
          <div>
            <p className="eyebrow">Account details</p>
            <h1 id="customer-profile-title">Your profile</h1>
            <p>Keep your contact details current for a seamless visit.</p>
          </div>
        </div>

        <form className="customer-profile-form" onSubmit={handleSubmit}>
          <label>
            <span>Full name</span>
            <input
              autoComplete="name"
              maxLength={100}
              name="name"
              required
              defaultValue={name}
            />
          </label>
          <label>
            <span>Email address</span>
            <input
              autoComplete="email"
              defaultValue={email}
              readOnly
              type="email"
            />
            <small>Email changes need to be verified by our team.</small>
          </label>
          <label>
            <span>Phone number</span>
            <input
              autoComplete="tel"
              maxLength={40}
              name="phone"
              defaultValue={phone ?? ""}
              type="tel"
            />
          </label>
          <div className="customer-profile-image-editor">
            <label>
              <span>Profile image</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                disabled={saving || readingImage}
                onChange={handleProfileImageChange}
                ref={imageFileInputRef}
                type="file"
              />
              <small>PNG, JPEG, or WebP. Maximum file size: 512 KB.</small>
            </label>
            {profileImagePreview && (
              <button
                className="customer-profile-image-remove"
                disabled={saving || readingImage}
                onClick={removeProfileImage}
                type="button"
              >
                Remove image
              </button>
            )}
          </div>

          {error && (
            <p className="customer-profile-message is-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="customer-profile-message" role="status">
              {message}
            </p>
          )}
          <div className="customer-profile-actions">
            <button
              className="button button-dark"
              disabled={saving || readingImage}
              type="submit"
            >
              {readingImage
                ? "Reading image…"
                : saving
                  ? "Saving…"
                  : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="customer-password-title"
        className="customer-password-card"
      >
        <div className="customer-password-heading">
          <p className="eyebrow">Security</p>
          <h2 id="customer-password-title">Change password</h2>
          <p>
            Choose a strong password you don’t use for another account. Changing
            it signs out your other active sessions.
          </p>
        </div>
        <form className="customer-profile-form" onSubmit={handlePasswordSubmit}>
          <label>
            <span>Current password</span>
            <input
              autoComplete="current-password"
              name="currentPassword"
              required
              type="password"
            />
          </label>
          <label>
            <span>New password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              name="newPassword"
              required
              type="password"
            />
            <small>Use at least 8 characters.</small>
          </label>
          <label>
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              name="confirmPassword"
              required
              type="password"
            />
          </label>
          {passwordError && (
            <p className="customer-profile-message is-error" role="alert">
              {passwordError}
            </p>
          )}
          {passwordMessage && (
            <p className="customer-profile-message" role="status">
              {passwordMessage}
            </p>
          )}
          <div className="customer-profile-actions">
            <button
              className="button button-dark"
              disabled={passwordSaving}
              type="submit"
            >
              {passwordSaving ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
