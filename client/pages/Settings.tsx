import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateOnly } from "@/lib/utils";
import {
  Upload,
  AlertCircle,
  Check,
  User,
  Users,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

interface ClaimSettings {
  lineCount: number;
  cooldownMinutes: number;
}

// Sorter Settings Panel Component
function SorterSettingsPanel() {
  const { token, isAdmin } = useAuth();
  const [settings, setSettings] = useState<ClaimSettings>({
    lineCount: 5,
    cooldownMinutes: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cooldownOptions = [30, 60, 120, 180, 240, 300, 360, 3600];
  const cooldownLabels = ["30s", "1m", "2m", "3m", "4m", "5m", "6m", "60m"];

  useEffect(() => {
    const fetchSettings = async () => {
      if (!token || !isAdmin) return;

      try {
        setLoading(true);
        const response = await fetch("/api/claim/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setSettings({
            ...data,
            cooldownMinutes: data.cooldownMinutes * 60,
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [token, isAdmin]);

  const handleSaveSettings = async () => {
    if (!token || !isAdmin) return;

    try {
      setSaving(true);
      const response = await fetch("/api/claim/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineCount: settings.lineCount,
          cooldownMinutes: settings.cooldownMinutes / 60,
        }),
      });

      if (response.ok) {
        toast.success("Settings updated successfully");
      } else {
        const errorData = await response.json();
        console.error("Settings save error:", errorData);
        toast.error(errorData.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            Loading settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Numbers Claim Settings</CardTitle>
        <CardDescription>
          Configure cooldown timer and claim line count
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Cooldown Timer (seconds)
              </Label>
              <span className="text-sm font-semibold text-primary">
                {cooldownLabels[
                  cooldownOptions.indexOf(settings.cooldownMinutes)
                ] || settings.cooldownMinutes + "s"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={cooldownOptions.length - 1}
              step="1"
              value={cooldownOptions.indexOf(settings.cooldownMinutes)}
              onChange={(e) => {
                const index = parseInt(e.target.value);
                setSettings({
                  ...settings,
                  cooldownMinutes: cooldownOptions[index],
                });
              }}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30s</span>
              <span>60m</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Lines to Claim Per Request
              </Label>
              <span className="text-sm font-semibold text-primary">
                {settings.lineCount} lines
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={settings.lineCount}
              onChange={(e) => {
                setSettings({
                  ...settings,
                  lineCount: parseInt(e.target.value),
                });
              }}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 line</span>
              <span>15 lines</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full"
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Account Information Panel Component
function AccountInfoPanel({
  user,
  token,
}: {
  user: any;
  token: string | null;
}) {
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    if (!token || !newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/profile/update-name", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        localStorage.setItem("user", JSON.stringify(updatedUser));
        toast.success("Name updated successfully");
        setEditName(false);
      } else {
        toast.error("Failed to update name");
      }
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error("Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>Manage your account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Name</Label>
          {editName ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
              />
              <Button
                onClick={handleSaveName}
                disabled={saving}
                size="sm"
                className="flex-shrink-0"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={() => {
                  setEditName(false);
                  setNewName(user?.name || "");
                }}
                variant="outline"
                size="sm"
                className="flex-shrink-0"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <Input
                value={user?.name || ""}
                disabled
                className="bg-transparent border-0"
              />
              <Button
                onClick={() => setEditName(true)}
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Email</Label>
          <Input value={user?.email || ""} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Role</Label>
          <Input
            value={user?.role || ""}
            disabled
            className="bg-muted capitalize"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Password Change Panel Component
function PasswordChangePanel({
  user,
  token,
}: {
  user: any;
  token: string | null;
}) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      toast.error("All fields are required");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (formData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        toast.success("Password changed successfully");
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm font-medium">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    currentPassword: e.target.value,
                  })
                }
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    newPassword: e.target.value,
                  })
                }
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-medium">
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••���•"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Team Account Creation Component
function TeamMembersPanel() {
  const { token, isAdmin } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{
    [key: string]: boolean;
  }>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!token || !isAdmin) return;

      try {
        setLoading(true);
        const response = await fetch("/api/members", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setMembers(data);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [token, isAdmin]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast.error("All fields are required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        const newMember = await response.json();
        setMembers([...members, newMember]);
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
        setShowForm(false);
        toast.success("Team member created successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create team member");
      }
    } catch (error) {
      console.error("Error creating member:", error);
      toast.error("Failed to create team member");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            Loading team members...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Team Member</CardTitle>
          <CardDescription>Add a new member to your team</CardDescription>
        </CardHeader>
        <CardContent>
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full">
              Add New Team Member
            </Button>
          ) : (
            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member-name" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="member-name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="member-password"
                  className="text-sm font-medium"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="member-password"
                    type={showPasswords["password"] ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        password: !showPasswords["password"],
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords["password"] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="member-confirm-password"
                  className="text-sm font-medium"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="member-confirm-password"
                    type={
                      showPasswords["confirmPassword"] ? "text" : "password"
                    }
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        confirmPassword: !showPasswords["confirmPassword"],
                      })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords["confirmPassword"] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Creating..." : "Create Member"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      name: "",
                      email: "",
                      password: "",
                      confirmPassword: "",
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in your
            team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              No team members yet
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {member.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground capitalize">
                      {member.role}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateOnly(member.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { user, token, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>(
    user?.profilePictureUrl || "",
  );
  const [previewUrl, setPreviewUrl] = useState<string>(
    user?.profilePictureUrl || "",
  );

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("File must be an image");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setProfilePicture(file.name);
  };

  const handleUpload = async () => {
    if (!previewUrl || !token) return;

    try {
      setLoading(true);
      setSuccess(false);

      const response = await fetch("/api/profile/upload-picture", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profilePictureUrl: previewUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload profile picture");
      }

      setSuccess(true);
      toast.success("Profile picture updated successfully");

      if (user) {
        const updatedUser = { ...user, profilePictureUrl: previewUrl };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      toast.error("Failed to upload profile picture");
      console.error("Upload error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div
        className="max-w-4xl py-8"
        style={{ width: "auto", margin: "0 auto" }}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account, team, and preferences
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>

              {isAdmin && (
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Team</span>
                </TabsTrigger>
              )}

              {isAdmin && (
                <TabsTrigger value="sorter" className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Sorter</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Profile Settings Tab */}
            <TabsContent value="profile" className="space-y-6">
              {/* Profile Picture Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>
                    Upload a profile picture to personalize your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current and Preview */}
                  <div className="flex gap-8 items-center">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Current
                      </Label>
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={user?.profilePictureUrl} />
                        <AvatarFallback className="bg-primary/20 text-primary text-lg">
                          {getInitials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {previewUrl && previewUrl !== user?.profilePictureUrl && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Preview
                        </Label>
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={previewUrl} />
                          <AvatarFallback className="bg-primary/20 text-primary text-lg">
                            {getInitials(user?.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>

                  {/* Upload Section */}
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                      <label htmlFor="file-input" className="cursor-pointer">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </label>
                      <input
                        id="file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>

                    {profilePicture && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {profilePicture}
                      </p>
                    )}

                    {success && (
                      <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm text-green-800">
                          Profile picture updated successfully
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleUpload}
                      disabled={
                        !previewUrl ||
                        loading ||
                        previewUrl === user?.profilePictureUrl
                      }
                      className="w-full"
                    >
                      {loading ? "Uploading..." : "Upload Picture"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Account Information Card */}
              <AccountInfoPanel user={user} token={token} />

              {/* Password Change Card */}
              <PasswordChangePanel user={user} token={token} />
            </TabsContent>

            {/* Team Management Tab (Admin Only) */}
            {isAdmin && (
              <TabsContent value="team" className="space-y-6">
                <TeamMembersPanel />
              </TabsContent>
            )}

            {/* Sorter Settings Tab (Admin Only) */}
            {isAdmin && (
              <TabsContent value="sorter" className="space-y-6">
                <SorterSettingsPanel />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}
