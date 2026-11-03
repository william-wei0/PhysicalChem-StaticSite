import { AccordionContext } from "./accordion-context";
import { AccordionItemContext } from "./accordion-context";
import { useState } from "react";

export const AccordionProvider = ({
    children,
    allowMultiple = false,
} : {
    children: React.ReactNode,
    allowMultiple?: boolean,
}) => {
    const [activeContent, setActiveContent] = useState<string[]>([]);

    const handleTrigger = (id: string | null) => {
        if (!id) return;
        setActiveContent((prev) => {
            const isActive = prev.includes(id);
            if (allowMultiple) {
                return isActive ? prev.filter((i) => i !== id) : [...prev, id];
            }
            return isActive ? [] : [id];
        });
    };

    return (
        <AccordionContext.Provider value={{ activeContent, handleTrigger, allowMultiple }}>
            {children}
        </AccordionContext.Provider>
    );
};


export const AccordionItemProvider = ({ 
    id,
    children 
}: {
    id: string | null;
    children: React.ReactNode
}) => {
    const value = {
        id
    }
    return (
        <>
            <AccordionItemContext.Provider value={value}>
                    { children }
            </AccordionItemContext.Provider>
        </>
    )
}
