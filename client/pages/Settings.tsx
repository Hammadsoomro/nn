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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateOnly } from "@/lib/utils";
import {
  User,
  Users,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  ChevronDown,
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
      <Card className="border-border/40">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground font-medium">
            Loading settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Numbers Claim Settings</CardTitle>
        <CardDescription className="text-xs">
          Configure cooldown timer and claim line count for your team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-foreground uppercase tracking-wider">
                Cooldown Timer
              </Label>
              <span className="text-sm font-extrabold text-primary bg-primary/10 px-2 py-1 rounded-lg">
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
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
              <span>30s</span>
              <span>60m</span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-foreground uppercase tracking-wider">
                Lines Per Request
              </Label>
              <span className="text-sm font-extrabold text-primary bg-primary/10 px-2 py-1 rounded-lg">
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
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
              <span>1 line</span>
              <span>15 lines</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full h-12 font-bold rounded-xl"
        >
          {saving ? "Saving Changes..." : "Save Settings"}
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
    <Card className="border-border/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Account Information</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Manage your personal account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Full Name</Label>
          {editName ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
                className="bg-background border-border/50 rounded-xl"
              />
              <Button
                onClick={handleSaveName}
                disabled={saving}
                size="sm"
                className="rounded-xl px-4 font-bold"
              >
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditName(false);
                  setNewName(user?.name || "");
                }}
                variant="outline"
                size="sm"
                className="rounded-xl px-4"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border border-border/40 rounded-xl bg-muted/30">
              <p className="font-bold text-foreground">{user?.name}</p>
              <Button
                onClick={() => setEditName(true)}
                variant="ghost"
                size="sm"
                className="text-primary font-bold hover:bg-primary/5"
              >
                Edit
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Address</Label>
          <Input value={user?.email || ""} disabled className="bg-muted/30 border-border/40 rounded-xl font-medium" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">User Role</Label>
          <div className="px-4 py-3 border border-border/40 rounded-xl bg-muted/30">
             <span className="text-sm font-extrabold capitalize text-foreground">{user?.role}</span>
          </div>
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
    <Card className="border-border/40 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Security</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Update your account password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="••••••••"
                className="bg-background border-border/50 rounded-xl"
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
            <Label htmlFor="new-password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
              New Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••"
                className="bg-background border-border/50 rounded-xl"
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
            <Label htmlFor="confirm-password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                className="bg-background border-border/50 rounded-xl"
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

          <Button type="submit" disabled={saving} className="w-full h-12 font-bold rounded-xl">
            {saving ? "Updating..." : "Update Password"}
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
      <Card className="border-border/40">
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground font-medium">
            Loading team members...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl font-bold">Team Management</CardTitle>
            <CardDescription className="text-xs">Add and manage your team members</CardDescription>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl font-bold px-6">
              Add Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleCreateMember} className="space-y-5 border-b border-border/40 pb-8 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="member-name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Name
                  </Label>
                  <Input
                    id="member-name"
                    placeholder="John Doe"
                    className="bg-background border-border/50 rounded-xl"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-email" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Email
                  </Label>
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="john@example.com"
                    className="bg-background border-border/50 rounded-xl"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="member-password"
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="member-password"
                      type={showPasswords["password"] ? "text" : "password"}
                      placeholder="••••••••"
                      className="bg-background border-border/50 rounded-xl"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
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
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1"
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
                      className="bg-background border-border/50 rounded-xl"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPasswords["confirmPassword"] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting} className="flex-1 h-12 rounded-xl font-bold">
                  {submitting ? "Creating..." : "Confirm & Create"}
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
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-3">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
               Active Team ({members.length})
             </p>
             {members.length === 0 ? (
               <div className="text-center text-muted-foreground py-10 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                 No team members yet
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {members.map((member) => (
                   <div
                     key={member._id}
                     className="flex items-center gap-3 p-4 border border-border/40 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-all group"
                   >
                     <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground group-hover:scale-110 transition-transform">
                       {member.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-bold text-foreground text-sm truncate leading-tight">
                         {member.name}
                       </p>
                       <p className="text-[10px] text-muted-foreground font-medium truncate">
                         {member.email}
                       </p>
                     </div>
                     <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-primary/10 text-primary rounded-md capitalize tracking-wider">{member.role}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">{formatDateOnly(member.createdAt)}</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { user, token, isAdmin } = useAuth();

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground font-medium">
            Manage your personal profile and platform configurations.
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/40">
            <TabsTrigger value="profile" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              My Profile
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="team" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Team
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="sorter" className="rounded-xl px-8 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Config
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6 animate-fade-in">
            <AccountInfoPanel user={user} token={token} />
            <PasswordChangePanel user={user} token={token} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="team" className="animate-fade-in">
              <TeamMembersPanel />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="sorter" className="animate-fade-in">
              <SorterSettingsPanel />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
