import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { AuthProvider } from "@/context/AuthContext";
import { RequireStaff } from "@/components/admin/RequireStaff";
import { RequireAuth } from "@/components/auth/RequireAuth";

const Home = lazy(() => import("@/pages/Home"));
const Universities = lazy(() => import("@/pages/Universities"));
const UniversityDetail = lazy(() => import("@/pages/UniversityDetail"));
const Courses = lazy(() => import("@/pages/Courses"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const Resources = lazy(() => import("@/pages/Resources"));
const Categories = lazy(() => import("@/pages/Categories"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("@/pages/auth/VerifyEmail"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const Bookmarks = lazy(() => import("@/pages/Bookmarks"));
const StudyBuddy = lazy(() => import("@/pages/StudyBuddy"));
const UploadPdf = lazy(() => import("@/pages/uploads/UploadPdf"));
const MyUploads = lazy(() => import("@/pages/uploads/MyUploads"));

const AdminPdfs = lazy(() => import("@/pages/admin/AdminPdfs"));
const AdminColleges = lazy(() => import("@/pages/admin/AdminColleges"));

const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminOverview = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminEntityPage = lazy(() => import("@/pages/admin/AdminEntityPage"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));

const RouteFallback = () => (
  <div className="container-page py-24">
    <CardSkeletonGrid count={3} testId="route-loading" />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/universities" element={<Universities />} />
            <Route path="/universities/:slug" element={<UniversityDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/legal/:page" element={<LegalPage />} />

            {/* Authentication */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Authenticated */}
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route
              path="/bookmarks"
              element={
                <RequireAuth>
                  <Bookmarks />
                </RequireAuth>
              }
            />
            <Route
              path="/study-buddy"
              element={
                <RequireAuth>
                  <StudyBuddy />
                </RequireAuth>
              }
            />

            <Route
              path="/dashboard/uploads"
              element={
                <RequireAuth>
                  <MyUploads />
                </RequireAuth>
              }
            />
            <Route
              path="/dashboard/uploads/new"
              element={
                <RequireAuth>
                  <UploadPdf />
                </RequireAuth>
              }
            />

            {/* Staff */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/pdfs"
              element={
                <RequireStaff>
                  <AdminPdfs />
                </RequireStaff>
              }
            />
            <Route
              path="/admin/colleges"
              element={
                <RequireStaff>
                  <AdminColleges />
                </RequireStaff>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireStaff>
                  <AdminOverview />
                </RequireStaff>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireStaff>
                  <AdminUsers />
                </RequireStaff>
              }
            />
            <Route
              path="/admin/:entity"
              element={
                <RequireStaff>
                  <AdminEntityPage />
                </RequireStaff>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}
