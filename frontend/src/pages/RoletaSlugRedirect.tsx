import { useParams, Navigate } from "react-router-dom";

export default function RoletaSlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <Navigate to="/" replace />;
  return <Navigate to={`/${slug}/roleta`} replace />;
}
