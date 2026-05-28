"use client";

import React from "react";
import { ClientInfo } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User } from "lucide-react";

interface ClientInfoSectionProps {
  client: ClientInfo;
  onUpdate: (patch: Partial<ClientInfo>) => void;
}

export function ClientInfoSection({ client, onUpdate }: ClientInfoSectionProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5 text-primary" /> ข้อมูลลูกค้า
        </CardTitle>
        <CardDescription>ข้อมูลผู้รับใบเสนอราคา</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cl-name">ชื่อบริษัทลูกค้า</Label>
            <Input
              id="cl-name"
              value={client.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="บริษัท ลูกค้า จำกัด"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-taxid">เลขประจำตัวผู้เสียภาษี</Label>
            <Input
              id="cl-taxid"
              value={client.taxId ?? ""}
              onChange={(e) => onUpdate({ taxId: e.target.value })}
              maxLength={13}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cl-address">ที่อยู่</Label>
          <Textarea
            id="cl-address"
            value={client.address ?? ""}
            onChange={(e) => onUpdate({ address: e.target.value })}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cl-person">ผู้ติดต่อ</Label>
            <Input
              id="cl-person"
              value={client.contactPerson ?? ""}
              onChange={(e) => onUpdate({ contactPerson: e.target.value })}
              placeholder="คุณสมชาย"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-email">อีเมลผู้ติดต่อ</Label>
            <Input
              id="cl-email"
              type="email"
              value={client.contactEmail ?? ""}
              onChange={(e) => onUpdate({ contactEmail: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-phone">เบอร์โทรผู้ติดต่อ</Label>
            <Input
              id="cl-phone"
              value={client.contactPhone ?? ""}
              onChange={(e) => onUpdate({ contactPhone: e.target.value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
