"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PencilLine, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { financeService } from "@/services/finance.service";
import type { ServiceCatalogDto } from "@/types/finance.types";
import { showApiError } from "@/components/finance/finance-utils";

export function ServiceCatalogView() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["finance", "catalog", "services"],
    queryFn: () => financeService.listServices(false),
  });
  const groups = useQuery({
    queryKey: ["finance", "catalog", "groups"],
    queryFn: () => financeService.serviceGroups(),
  });

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState<string>("CONSULTATION");
  const [tariff, setTariff] = useState("");
  const [description, setDescription] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState("CONSULTATION");
  const [editTariff, setEditTariff] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editActive, setEditActive] = useState(true);

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (groupFilter !== "ALL" && r.serviceGroup !== groupFilter) return false;
      if (!term) return true;
      return (
        r.serviceName.toLowerCase().includes(term) ||
        r.serviceCode.toLowerCase().includes(term) ||
        r.nhisTariffCode.toLowerCase().includes(term)
      );
    });
  }, [list.data, search, groupFilter]);

  const createMut = useMutation({
    mutationFn: financeService.createService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "catalog", "services"] });
      toast.success("Service added to catalog");
      setCode("");
      setName("");
      setTariff("");
      setDescription("");
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  const updateMut = useMutation({
    mutationFn: (input: { id: string; payload: Parameters<typeof financeService.updateService>[1] }) =>
      financeService.updateService(input.id, input.payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "catalog", "services"] });
      toast.success("Service updated");
      setEditId(null);
    },
    onError: (e) => toast.error(showApiError(e)),
  });

  function startEdit(row: ServiceCatalogDto) {
    setEditId(row.id);
    setEditName(row.serviceName);
    setEditGroup(row.serviceGroup);
    setEditTariff(row.nhisTariffCode);
    setEditDesc(row.description);
    setEditActive(row.active);
  }

  function submitCreate() {
    if (!code.trim() || !name.trim()) {
      toast.error("Service code and name are required");
      return;
    }
    createMut.mutate({
      serviceCode: code.trim(),
      serviceName: name.trim(),
      serviceGroup: group,
      nhisTariffCode: tariff.trim(),
      description: description.trim(),
      active: true,
    });
  }

  function submitEdit() {
    if (!editId) return;
    if (!editName.trim()) {
      toast.error("Service name is required");
      return;
    }
    updateMut.mutate({
      id: editId,
      payload: {
        serviceName: editName.trim(),
        serviceGroup: editGroup,
        nhisTariffCode: editTariff.trim(),
        description: editDesc.trim(),
        active: editActive,
      },
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Service catalog</CardTitle>
          <CardDescription>
            Single source of canonical service names. Every billing, ordering and reporting screen across the system pulls from
            this list — no free-text service names anywhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or NHIA tariff…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All groups</SelectItem>
                {(groups.data ?? []).map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {list.isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
            </p>
          )}
          {list.isError && <p className="text-sm text-destructive">Could not load catalog.</p>}

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Group</th>
                  <th className="px-3 py-2 font-medium">NHIA tariff</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{row.serviceCode}</td>
                    <td className="px-3 py-2">{row.serviceName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.serviceGroup}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.nhisTariffCode || "—"}</td>
                    <td className="px-3 py-2">{row.active ? "Yes" : "No"}</td>
                    <td className="px-3 py-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(row)}>
                        <PencilLine className="mr-1 h-3 w-3" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !list.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No services match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add new service</CardTitle>
            <CardDescription>Codes and names must be unique within this facility.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Service code (e.g. LAB-CBC)" value={code} onChange={(e) => setCode(e.target.value)} />
            <Input placeholder="Service name (e.g. Full Blood Count)" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(groups.data ?? []).map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="NHIA tariff code (optional)" value={tariff} onChange={(e) => setTariff(e.target.value)} />
            <Textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <Button type="button" onClick={submitCreate} disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save service"}
            </Button>
          </CardContent>
        </Card>

        {editId && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Edit service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Select value={editGroup} onValueChange={setEditGroup}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(groups.data ?? []).map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input value={editTariff} onChange={(e) => setEditTariff(e.target.value)} placeholder="NHIA tariff code" />
              <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
              <Select value={editActive ? "yes" : "no"} onValueChange={(v) => setEditActive(v === "yes")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Active</SelectItem>
                  <SelectItem value="no">Inactive (hidden from billing dropdowns)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={submitEdit} disabled={updateMut.isPending}>
                  {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditId(null)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
