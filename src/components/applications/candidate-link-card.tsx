import { ExternalLinkIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { rotateRoomToken } from "@/app/(dashboard)/rooms/actions";
import { ConfirmActionDialog } from "@/components/actions/confirm-action-dialog";
import { CopyButton } from "@/components/actions/copy-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RoomStatus } from "@/lib/rooms/board-state";

// The room's public link (/apply/<token>), with copy, open and replace. It
// warns when the link would not accept applications, mirroring the checks
// of submit_application.
export async function CandidateLinkCard({
  room,
  origin,
  contactEmail,
}: {
  room: { id: string; name: string; status: RoomStatus; public_token: string };
  origin: string;
  contactEmail: string | null;
}) {
  const t = await getTranslations("applications");
  const url = `${origin}/apply/${room.public_token}`;
  const closed =
    room.status === "unavailable"
      ? t("closedUnavailable")
      : contactEmail === null
        ? t("closedNoContact")
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("linkTitle")}</h2>
        </CardTitle>
        <CardDescription>{t("linkHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {closed ? (
          <Alert>
            <AlertDescription className="flex flex-wrap gap-x-2">
              <span>{closed}</span>
              {contactEmail === null ? (
                <Link
                  href="/settings/organization"
                  className="underline underline-offset-4"
                >
                  {t("setContact")}
                </Link>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        <Input
          readOnly
          value={url}
          aria-label={t("link", { room: room.name })}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={url} label={t("copy")} copiedLabel={t("copied")} />
          <Button variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon aria-hidden />
              {t("open")}
            </a>
          </Button>
          <ConfirmActionDialog
            triggerLabel={t("rotate")}
            title={t("rotateTitle")}
            description={t("rotateDescription")}
            confirmLabel={t("rotate")}
            action={rotateRoomToken.bind(null, room.id)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
