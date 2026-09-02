// Shared frame for every auth screen (login, signup, forgot/reset password,
// find-order). The (auth) layout already provides the column and the brand
// panel, so these screens deliberately have no Card of their own — a card
// inside a dedicated panel is chrome for its own sake.
export function AuthFormShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
      {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
    </div>
  );
}
