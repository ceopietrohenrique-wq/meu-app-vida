"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";

import { useCustomerInteractions } from "../queries/use-customer-interactions";
import { useLogInteraction } from "../mutations/use-interaction-mutations";
import { useSetCustomerFollowUp } from "../mutations/use-customer-mutations";
import {
  INTERACTION_TYPES,
  logInteractionSchema,
  type LogInteractionFormValues,
  type LogInteractionInput,
} from "../schemas/interaction-schema";
import {
  setFollowUpSchema,
  type SetFollowUpFormValues,
  type SetFollowUpInput,
} from "../schemas/customer-schema";
import type { Customer } from "../types/customer";

const INTERACTION_LABEL: Record<string, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  visita: "Visita",
  email: "Email",
  proposta: "Proposta",
  nota: "Nota",
};

export function CustomerDetailDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const setFollowUp = useSetCustomerFollowUp();
  const logInteraction = useLogInteraction();
  const { data: interactions = [] } = useCustomerInteractions(customer.id);

  const followUpForm = useForm<
    SetFollowUpFormValues,
    unknown,
    SetFollowUpInput
  >({
    resolver: zodResolver(setFollowUpSchema),
    defaultValues: {
      customerId: customer.id,
      nextAction: customer.nextAction ?? undefined,
      nextActionDate: customer.nextActionDate ?? undefined,
      nextActionTime: customer.nextActionTime ?? undefined,
      nextActionNotes: customer.nextActionNotes ?? undefined,
    },
  });

  const interactionForm = useForm<
    LogInteractionFormValues,
    unknown,
    LogInteractionInput
  >({
    resolver: zodResolver(logInteractionSchema),
    defaultValues: { customerId: customer.id, type: "ligacao" },
  });

  async function onSaveFollowUp(values: SetFollowUpInput) {
    try {
      await setFollowUp.mutateAsync(values);
      toast.success("Próxima ação salva.");
    } catch {
      toast.error("Não foi possível salvar a próxima ação.");
    }
  }

  async function onLogInteraction(values: LogInteractionInput) {
    try {
      await logInteraction.mutateAsync(values);
      toast.success("Interação registrada.");
      interactionForm.reset({
        customerId: customer.id,
        type: "ligacao",
        notes: "",
      });
    } catch {
      toast.error("Não foi possível registrar a interação.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Detalhes
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <form
            onSubmit={followUpForm.handleSubmit(onSaveFollowUp)}
            className="flex flex-col gap-3"
          >
            <p className="text-sm font-medium">Próxima ação</p>
            <Input
              placeholder="O que fazer"
              {...followUpForm.register("nextAction")}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" {...followUpForm.register("nextActionDate")} />
              <Input type="time" {...followUpForm.register("nextActionTime")} />
            </div>
            <Input
              placeholder="Observação"
              {...followUpForm.register("nextActionNotes")}
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={followUpForm.formState.isSubmitting}
            >
              Salvar próxima ação
            </Button>
          </form>

          <form
            onSubmit={interactionForm.handleSubmit(onLogInteraction)}
            className="flex flex-col gap-3 border-t pt-4"
          >
            <p className="text-sm font-medium">Registrar interação</p>
            <select
              aria-label="Tipo de interação"
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
              {...interactionForm.register("type")}
            >
              {INTERACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {INTERACTION_LABEL[type]}
                </option>
              ))}
            </select>
            <Input
              placeholder="Observação"
              {...interactionForm.register("notes")}
            />
            <Button
              type="submit"
              size="sm"
              disabled={interactionForm.formState.isSubmitting}
            >
              Registrar interação
            </Button>
          </form>

          {interactions.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-sm font-medium">Histórico</p>
              <ul className="flex flex-col gap-1.5">
                {interactions.map((interaction) => (
                  <li key={interaction.id} className="text-xs">
                    <span className="font-medium">
                      {INTERACTION_LABEL[interaction.type]}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {new Date(interaction.occurredAt).toLocaleString("pt-BR")}
                    </span>
                    {interaction.notes && <p>{interaction.notes}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
