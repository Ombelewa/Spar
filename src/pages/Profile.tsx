import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, MapPin, Phone, Mail, Settings, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/supabase";

interface ProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  profile_picture_url?: string;
}

interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  is_default: boolean;
}

const Profile = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "",
    street: "",
    city: "",
    is_default: false,
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const navigate = useNavigate();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const fetchData = async () => {
      if (!isMounted.current) return;

      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log("User:", user, "User Error:", userError);
        if (userError) {
          throw new Error("Authentication error: " + userError.message);
        }
        if (!user) {
          console.log("No user found, redirecting to auth");
          navigate("/auth");
          return;
        }

        let profileData = null;
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        console.log("Profile Data:", data, "Profile Error:", profileError);

        if (profileError && profileError.code !== "PGRST116") {
          throw new Error("Profile fetch error: " + profileError.message);
        }

        if (!data) {
          // Create default profile if none exists
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert([
              {
                id: user.id,
                first_name: user.user_metadata.first_name || "User",
                last_name: user.user_metadata.last_name || "Unknown",
                email: user.email || "",
                phone: "",
              },
            ])
            .select()
            .single();
          console.log("New Profile:", newProfile, "Insert Error:", insertError);
          if (insertError) throw new Error("Profile creation error: " + insertError.message);
          profileData = newProfile;
        } else {
          profileData = data;
        }

        setProfile(profileData);

        const { data: addressData, error: addressError } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false });
        console.log("Address Data:", addressData, "Address Error:", addressError);
        if (addressError) throw new Error("Address fetch error: " + addressError.message);
        setAddresses(addressData || []);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message || "Failed to load profile data");
        if (isMounted.current) navigate("/auth");
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [navigate]);

  const validatePhone = (phone: string) => {
    return phone === "" || /^\+?1?\d{9,15}$/.test(phone);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setError("No profile data available");
      return;
    }
    setLoading(true);
    setError(null);

    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setError("First name and last name are required");
      setLoading(false);
      return;
    }

    if (!validatePhone(profile.phone)) {
      setError("Invalid phone number format (e.g., +1234567890)");
      setLoading(false);
      return;
    }

    try {
      let profilePictureUrl = profile.profile_picture_url;
      if (profilePicture) {
        if (profilePicture.size > 2 * 1024 * 1024) {
          throw new Error("Profile picture must be less than 2MB");
        }
        if (!["image/jpeg", "image/png"].includes(profilePicture.type)) {
          throw new Error("Only JPEG or PNG images are allowed");
        }

        const fileExt = profilePicture.name.split(".").pop();
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(fileName, profilePicture, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) throw new Error("Upload error: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage
          .from("profile-pictures")
          .getPublicUrl(fileName);
        profilePictureUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profile.first_name.trim(),
          last_name: profile.last_name.trim(),
          phone: profile.phone.trim(),
          profile_picture_url: profilePictureUrl,
        })
        .eq("id", profile.id);

      if (error) throw new Error("Update error: " + error.message);
      setProfile({ ...profile, profile_picture_url: profilePictureUrl });
      setProfilePicture(null);
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Save Profile Error:", err);
      setError(err.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setError("No profile data available");
      return;
    }
    setLoading(true);
    setError(null);

    if (!newAddress.label.trim() || !newAddress.street.trim() || !newAddress.city.trim()) {
      setError("All address fields are required");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("addresses")
        .insert([
          {
            user_id: profile.id,
            label: newAddress.label.trim(),
            street: newAddress.street.trim(),
            city: newAddress.city.trim(),
            is_default: newAddress.is_default,
          },
        ])
        .select();

      if (error) throw new Error("Add address error: " + error.message);
      setAddresses([...addresses, ...data]);
      setNewAddress({ label: "", street: "", city: "", is_default: false });
      setShowAddressForm(false);
      alert("Address added successfully!");
    } catch (err) {
      console.error("Add Address Error:", err);
      setError(err.message || "Error adding address");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!profile) {
      setError("No profile data available");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", profile.id);

      if (error) throw new Error("Set default error: " + error.message);

      const { data: addressData, error: addressError } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", profile.id)
        .order("is_default", { ascending: false });

      if (addressError) throw new Error("Fetch addresses error: " + addressError.message);
      setAddresses(addressData || []);
      alert("Default address updated!");
    } catch (err) {
      console.error("Set Default Error:", err);
      setError(err.message || "Error setting default address");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (err) {
      console.error("Sign Out Error:", err);
      setError(err.message || "Error signing out");
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicture(file);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Error: Please log in again</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar cartItemsCount={0} />
      <main className="container py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account and view your addresses</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="pt-6 text-center">
                {profile.profile_picture_url ? (
                  <img
                    src={profile.profile_picture_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold mb-4">
                    {profile.first_name?.[0] ?? "U"}
                    {profile.last_name?.[0] ?? "U"}
                  </div>
                )}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="profile-picture">Profile Picture</Label>
                  <Input
                    id="profile-picture"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleProfilePictureChange}
                    disabled={loading}
                  />
                </div>
                <h2 className="text-2xl font-bold mb-1">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-muted-foreground mb-4">Premium Member</p>
                <Badge className="mb-6">125 Orders Completed</Badge>
                <div className="w-full space-y-3">
                  <Button variant="outline" className="w-full justify-start" disabled={loading}>
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive"
                    onClick={handleSignOut}
                    disabled={loading}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profile.first_name}
                        onChange={(e) =>
                          setProfile({ ...profile, first_name: e.target.value })
                        }
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profile.last_name}
                        onChange={(e) =>
                          setProfile({ ...profile, last_name: e.target.value })
                        }
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      <Phone className="inline h-4 w-4 mr-2" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone ?? ""}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Saved Addresses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="border rounded-lg p-4 flex justify-between items-start"
                  >
                    <div>
                      {addr.is_default && <Badge className="mb-2">Default</Badge>}
                      <h3 className="font-semibold">{addr.label}</h3>
                      <p className="text-muted-foreground">
                        {addr.street}, {addr.city}
                      </p>
                    </div>
                    {!addr.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={loading}
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                ))}
                {showAddressForm ? (
                  <form onSubmit={handleAddAddress} className="space-y-4 border rounded-lg p-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="label">Address Label</Label>
                        <Input
                          id="label"
                          value={newAddress.label}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, label: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="street">Street</Label>
                        <Input
                          id="street"
                          value={newAddress.street}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, street: e.target.value })
                          }
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newAddress.city}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, city: e.target.value })
                        }
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={newAddress.is_default}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, is_default: e.target.checked })
                        }
                        disabled={loading}
                      />
                      <Label htmlFor="is_default">Set as default</Label>
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : "Save Address"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewAddress({ label: "", street: "", city: "", is_default: false });
                          setShowAddressForm(false);
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddressForm(true)}
                    disabled={loading}
                  >
                    + Add New Address
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;