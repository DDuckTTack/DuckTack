import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

// company
import CompanyPage from "./pages/company/CompanyPage";
import CompanyUnavailableTimesPage from "./pages/company/CompanyUnavailableTimesPage";
import CompanyCalendarPage from "./pages/company/CompanyCalendarPage";
import CompanyReservationsPage from "./pages/company/CompanyReservationsPage";
import CompanyReviewsPage from "./pages/company/CompanyReviewsPage";

// community
import CommunityListPage from "./pages/community/CommunityListPage";
import CommunityPostFormPage from "./pages/community/CommunityPostFormPage";
import CommunityPostDetailPage from "./pages/community/CommunityPostDetailPage";
import CommunityMyPostsPage from "./pages/community/CommunityMyPostsPage";

// messages (목업)
import MessagesInboxPage from "./pages/messages/MessagesInboxPage";
import MessageThreadPage from "./pages/messages/MessageThreadPage";

// admin
import AdminCompaniesPage from "./pages/admin/AdminCompaniesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminUserDetailPage from "./pages/admin/AdminUserDetailPage";
import ReservationsPage from "./pages/admin/ReservationsPage";
import ProductsPage from "./pages/admin/ProductsPage";
import AdminReviewsPage from "./pages/admin/AdminReviewsPage";
import AdminCommunityPage from "./pages/admin/AdminCommunityPage";
import AdminLayout from "./pages/admin/AdminLayout";

// route 보호
import AdminRoute from "./routes/AdminRoute";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* auth */}
                <Route path="/" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* company */}
                <Route
                    path="/company"
                    element={<CompanyPage />}
                />

                <Route
                    path="/calendar"
                    element={<CompanyCalendarPage />}
                />

                <Route
                    path="/unavailable"
                    element={<CompanyUnavailableTimesPage />}
                />

                <Route
                    path="/company/reservations"
                    element={<CompanyReservationsPage />}
                />

                <Route
                    path="/company/reviews"
                    element={<CompanyReviewsPage />}
                />

                {/* community */}
                <Route path="/company/community" element={<CommunityListPage />} />
                <Route path="/company/community/new" element={<CommunityPostFormPage />} />
                <Route path="/company/community/mine" element={<CommunityMyPostsPage />} />
                <Route path="/company/community/:postId" element={<CommunityPostDetailPage />} />
                <Route path="/company/community/:postId/edit" element={<CommunityPostFormPage />} />

                {/* 쪽지 (목업) */}
                <Route path="/company/messages" element={<MessagesInboxPage />} />
                <Route path="/company/messages/:threadId" element={<MessageThreadPage />} />

                {/* admin layout */}
                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <AdminLayout />
                        </AdminRoute>
                    }
                >
                    {/* 기본 admin 접속시 업체관리로 */}
                    <Route
                        index
                        element={<Navigate to="companies" replace />}
                    />

                    <Route
                        path="companies"
                        element={<AdminCompaniesPage />}
                    />

                    <Route
                        path="reservations"
                        element={<ReservationsPage />}
                    />

                    <Route
                        path="users"
                        element={<AdminUsersPage />}
                    />

                    <Route
                        path="users/:id"
                        element={<AdminUserDetailPage />}
                    />

                    <Route
                        path="products"
                        element={<ProductsPage />}
                    />

                    <Route
                        path="reviews"
                        element={<AdminReviewsPage />}
                    />

                    <Route
                        path="community"
                        element={<AdminCommunityPage />}
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;