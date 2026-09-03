/** Formulário público para clientes solicitarem projetos sob medida ao hub. */
import { type FormEvent, useState } from "react";
import { Check, LoaderCircle, Send } from "lucide-react";
import { supabase } from "../lib/supabase";
import "./ProjectRequestForm.css";

type SubmitStatus = "idle" | "sending" | "success" | "error";

export default function ProjectRequestForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [request, setRequest] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedRequest = request.trim();

    if (!trimmedName || !trimmedPhone || !trimmedRequest) {
      setMessage("Preencha nome, telefone e a solicitação antes de enviar.");
      setStatus("error");
      return;
    }

    if (!supabase) {
      setMessage("A integração com o banco não está disponível no momento. Tente novamente em instantes.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const { error } = await supabase.from("hub_requests").insert({
        name: trimmedName,
        phone: trimmedPhone,
        request: trimmedRequest,
      });
      if (error) throw error;

      setName("");
      setPhone("");
      setRequest("");
      setStatus("success");
      setMessage("Solicitação enviada! A equipe do hub vai entrar em contato pelo telefone informado.");
    } catch (submitError) {
      setStatus("error");
      setMessage(submitError instanceof Error ? submitError.message : "Não foi possível enviar sua solicitação.");
    }
  }

  return (
    <form className="request-form" onSubmit={handleSubmit} noValidate>
      <div className="request-form__row">
        <label className="field">
          <span>Nome</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome completo" autoComplete="name" required />
        </label>
        <label className="field">
          <span>Telefone</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" inputMode="tel" autoComplete="tel" required />
        </label>
      </div>
      <label className="field">
        <span>Solicitação</span>
        <textarea value={request} onChange={(event) => setRequest(event.target.value)} placeholder="Descreva o projeto que você gostaria que o hub criasse para você..." rows={5} required />
      </label>
      {message && (
        <p className={`request-form__alert ${status === "error" ? "request-form__alert--error" : ""}`} role={status === "error" ? "alert" : "status"}>
          {status === "success" ? <Check size={16} /> : null}
          {message}
        </p>
      )}
      <button type="submit" className="button button--primary request-form__submit" disabled={status === "sending"}>
        {status === "sending" ? <><LoaderCircle className="spin" size={17} /> Enviando...</> : <><Send size={16} /> Enviar solicitação</>}
      </button>
    </form>
  );
}
