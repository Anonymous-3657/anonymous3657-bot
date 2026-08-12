import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { AuthProvider } from "@/context/AuthContext";
import { RequireStaff } from "@/components/admin/RequireStaff";

const Home = lazy(() => import("@/pages/Home"));
const Universities = lazy(() => import("@/pages/Universities"));
const UniversityDetail = lazy(() => import("@/pages/UniversityDetail"));
const Courses = lazy(() => import("@/pages/Courses"));
const CourseDetail = lazy(() => import("@/pages/CourseDetail"));
const Resources = lazy(() => import("@/pages/Resources"));
const Categories = lazy(() => import("@/pages/Categories"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

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
            <Route path="/" element={<Home />} />
            <Route path="/universities" element={<Universities />} />
            <Route path="/universities/:slug" element={<UniversityDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/legal/:page" element={<LegalPage />} />

            <Route path="/admin/login" element={<AdminLogin />} />
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
