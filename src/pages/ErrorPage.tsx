export default function ErrorPage() {
  return (
    <>
      <div
        className="flex flex-col items-center justify-center text-center px-4"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        <p className="text-[120px] font-medium leading-none mb-4 text-outline-variant">404</p>
        <h1 className="text-2xl font-medium text-on-surface mb-2">Page not found</h1>
        <p className="text-on-surface-variant text-base max-w-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
    </>
  );
}
