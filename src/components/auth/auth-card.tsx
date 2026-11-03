import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { WisalMark } from "@/components/brand/wisal-logo";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <WisalMark className="h-9" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">{title}</h1>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="justify-center">{footer}</CardFooter>
      </Card>
    </div>
  );
}
