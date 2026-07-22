import { redirect } from "next/navigation";

/** 原产品已迁至采购模块 */
export default function MasterDataFamiliesRedirect() {
  redirect("/purchasing/families");
}
