import { useParams, Navigate } from "react-router-dom";

export default function ReservaSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/" replace />;
  return <Navigate to={`/${slug}/reserva`} replace />;
}
