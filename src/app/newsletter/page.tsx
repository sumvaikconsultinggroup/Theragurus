import { Newsletter } from "@/components/Newsletter";
export const metadata={title:"Newsletter preferences",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const params=await searchParams;return <Newsletter action={params.unsubscribe?"unsubscribe":params.confirm?"confirm":undefined} token={params.unsubscribe||params.confirm}/>;}
