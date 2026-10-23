"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Edit3,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import { useCustomer } from "@/lib/state/customer";

export function CustomerAccountTab() {
  const { profile, updateProfile } = useCustomer();
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [addressLine1, setAddressLine1] = useState(profile.addressLine1);
  const [city, setCity] = useState(profile.city);
  const [stateVal, setStateVal] = useState(profile.state);
  const [postalCode, setPostalCode] = useState(profile.postalCode);
  const [preferredContact, setPreferredContact] = useState(profile.preferredContact);

  const handleEdit = () => {
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email);
    setPhone(profile.phone);
    setAddressLine1(profile.addressLine1);
    setCity(profile.city);
    setStateVal(profile.state);
    setPostalCode(profile.postalCode);
    setPreferredContact(profile.preferredContact);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      firstName,
      lastName,
      email,
      phone,
      addressLine1,
      city,
      state: stateVal,
      postalCode,
      preferredContact,
    });
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-[12.5px] text-ivory-faint uppercase tracking-wider">
            PROFILE MANAGEMENT
          </div>
          <h1 className="mt-1 font-display text-[clamp(26px,3vw,34px)] leading-tight text-ivory">
            My Account
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            View and update your personal contact information and delivery preferences.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={handleEdit}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-medium self-start sm:self-auto"
          >
            <Edit3 size={15} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Save Success Alert */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-2xl border border-sage/30 bg-sage/[0.08] p-4 text-[14px] text-ivory"
          >
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage text-white">
              <Check size={14} strokeWidth={3} />
            </div>
            <span>Profile information successfully updated (simulated frontend state).</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left Column: Personal Profile Form / Display */}
        <section className="sheet p-6 sm:p-7">
          <div className="flex items-center justify-between border-b hairline pb-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-champagne" />
              <h2 className="font-display text-[18px]">Personal Details</h2>
            </div>
            <span className="font-display text-[12.5px] text-ivory-faint">
              ID: {profile.id}
            </span>
          </div>

          {isEditing ? (
            <form onSubmit={handleSave} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12.5px] font-medium text-ivory-dim">First name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-ivory-dim">Last name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[12.5px] font-medium text-ivory-dim">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-ivory-dim">Phone number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-ivory-dim">Street address</label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12.5px] font-medium text-ivory-dim">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-slate/60 px-3 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-ivory-dim">State</label>
                  <input
                    type="text"
                    required
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-slate/60 px-3 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium text-ivory-dim">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-slate/60 px-3 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-medium text-ivory-dim">Preferred contact method</label>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-[13.5px] text-ivory cursor-pointer">
                    <input
                      type="radio"
                      name="contact"
                      checked={preferredContact === "in_app"}
                      onChange={() => setPreferredContact("in_app")}
                      className="accent-champagne"
                    />
                    <span>In-App Messages</span>
                  </label>
                  <label className="flex items-center gap-2 text-[13.5px] text-ivory cursor-pointer">
                    <input
                      type="radio"
                      name="contact"
                      checked={preferredContact === "sms"}
                      onChange={() => setPreferredContact("sms")}
                      className="accent-champagne"
                    />
                    <span>SMS / Text Message</span>
                  </label>
                  <label className="flex items-center gap-2 text-[13.5px] text-ivory cursor-pointer">
                    <input
                      type="radio"
                      name="contact"
                      checked={preferredContact === "email"}
                      onChange={() => setPreferredContact("email")}
                      className="accent-champagne"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t hairline pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-quiet rounded-xl px-5 py-2.5 text-[13.5px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-[13.5px] font-medium"
                >
                  <Save size={15} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <dl className="mt-6 divide-y divide-line text-[14px]">
              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <dt className="text-ivory-dim">Full Name</dt>
                <dd className="font-medium text-ivory">{profile.fullName}</dd>
              </div>
              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <dt className="text-ivory-dim">Email Address</dt>
                <dd className="font-medium text-ivory">{profile.email}</dd>
              </div>
              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <dt className="text-ivory-dim">Phone Number</dt>
                <dd className="font-medium text-ivory">{profile.phone}</dd>
              </div>
              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <dt className="text-ivory-dim">Billing Address</dt>
                <dd className="font-medium text-ivory text-right">
                  {profile.addressLine1}, {profile.city}, {profile.state} {profile.postalCode}, {profile.country}
                </dd>
              </div>
              <div className="flex flex-col py-3.5 sm:flex-row sm:justify-between">
                <dt className="text-ivory-dim">Preferred Contact Method</dt>
                <dd className="font-medium text-ivory capitalize">
                  {profile.preferredContact.replace("_", " ")}
                </dd>
              </div>
            </dl>
          )}
        </section>

        {/* Right Column: Account Status & Info */}
        <div className="space-y-6">
          <section className="sheet p-6">
            <div className="flex items-center gap-2 text-ivory">
              <Shield size={18} className="text-sage" />
              <h3 className="font-display text-[16px]">Account Status</h3>
            </div>

            <dl className="mt-4 space-y-3.5 text-[13.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-ivory-dim">Status</dt>
                <dd className="rounded-full bg-sage/15 px-2.5 py-0.5 font-medium text-sage ring-1 ring-sage/30">
                  {profile.accountStatus}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ivory-dim">Verification Tier</dt>
                <dd className="font-medium text-ivory">{profile.verificationStatus}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ivory-dim">Member Since</dt>
                <dd className="font-medium text-ivory">{profile.memberSince}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ivory-dim">Preferred Language</dt>
                <dd className="font-medium text-ivory">{profile.language}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ivory-dim">Base Currency</dt>
                <dd className="font-medium text-ivory">{profile.currency}</dd>
              </div>
            </dl>
          </section>

          <section className="sheet p-6">
            <h3 className="font-display text-[16px]">Demo Boundary Notice</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ivory-dim">
              This is a simulated customer portal. Edits made to your profile persist only within this browser session and do not interact with real external financial databases.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
