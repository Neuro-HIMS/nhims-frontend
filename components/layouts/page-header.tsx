// `PageHeader` is now an alias of `PageCard` (evolved into a card per design brief §2.5).
// Kept so existing call sites keep working until they're migrated to import `PageCard` directly.
export { PageCard as PageHeader } from "@/components/layouts/page-card";
