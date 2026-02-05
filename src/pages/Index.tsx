 import { PiracyAlertModal } from "@/components/ui/piracy-alert-modal";

const Index = () => {
  return (
     <>
       <div className="flex min-h-screen items-center justify-center bg-background">
         <div className="text-center">
           <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
           <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
         </div>
       </div>
       <PiracyAlertModal isOpen={true} />
     </>
  );
};

export default Index;
