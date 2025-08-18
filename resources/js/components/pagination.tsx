import {
    Pagination as PaginationContainer,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

type PaginationLinkData = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    links: PaginationLinkData[];
    className?: string;
};

export default function Pagination({ links, className }: Props) {
    if (links.length <= 3) {
        return null;
    }

    const prevLink = links[0];
    const nextLink = links[links.length - 1];
    const pageLinks = links.slice(1, -1);

    return (
        <PaginationContainer className={cn('w-full justify-center', className)}>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href={prevLink.url ?? '#'}
                        // Inertia Link's 'disabled' is not a valid prop for anchor tags.
                        // We use CSS and aria attributes for accessibility instead.
                        className={!prevLink.url ? 'pointer-events-none text-muted-foreground' : ''}
                        aria-disabled={!prevLink.url}
                        tabIndex={!prevLink.url ? -1 : undefined}
                    />
                </PaginationItem>

                {pageLinks.map((link, index) => (
                    <PaginationItem key={index}>
                        {link.url ? (
                            <PaginationLink href={link.url} isActive={link.active}>
                                {link.label}
                            </PaginationLink>
                        ) : (
                            <PaginationEllipsis />
                        )}
                    </PaginationItem>
                ))}

                <PaginationItem>
                    <PaginationNext
                        href={nextLink.url ?? '#'}
                        className={!nextLink.url ? 'pointer-events-none text-muted-foreground' : ''}
                        aria-disabled={!nextLink.url}
                        tabIndex={!nextLink.url ? -1 : undefined}
                    />
                </PaginationItem>
            </PaginationContent>
        </PaginationContainer>
    );
}
