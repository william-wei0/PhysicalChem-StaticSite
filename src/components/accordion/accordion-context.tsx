import React, { useContext } from "react";

export const AccordionContext = React.createContext<{
    activeContent: string[];
    handleTrigger: (id: string | null) => void;
    allowMultiple: boolean;
} | null>(null);
export const AccordionItemContext = React.createContext<{ 
    id: string | null 
} | null>(null);


export const useAccordionContext = () => {
    const context = useContext(AccordionContext);
    if( context === undefined) {
        throw new Error("useAccordion must be used within a <Accordion />");
    }
    return context;
}

export const useAccordionItemContext = () => {
    const context = useContext(AccordionItemContext);
    if( context === undefined) {
        throw new Error("useAccordionItemContext must be used within <AccordionItem />")
    }
    return context;
}