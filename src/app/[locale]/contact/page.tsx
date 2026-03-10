"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Mail, MapPin, MessageCircle, Send } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const t = useTranslations("contact");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    alert(t("form.success"));
    setSubmitted(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  }

  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <PageHero>
          <Badge className="mb-4 bg-white/10 text-white border border-white/20">
            Get in Touch
          </Badge>
          <Heading as="h1" size="h1" className="text-white mb-4">
            {t("title")}
          </Heading>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </PageHero>

        {/* Form + Info */}
        <Section bg="white">
          <Container>
            <AnimatedSection direction="up">
            <div className="grid gap-10 lg:grid-cols-3">
              {/* Contact Form */}
              <div className="lg:col-span-2">
                <Card className="p-6 sm:p-8">
                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6">
                        <Send className="h-8 w-8" />
                      </div>
                      <Heading as="h3" size="h4" className="text-navy mb-2">
                        {t("form.success")}
                      </Heading>
                      <p className="text-gray-500 max-w-md">
                        We typically respond within 24 hours. In the meantime,
                        check out our FAQ for quick answers.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => setSubmitted(false)}
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        <Input
                          id="name"
                          name="name"
                          label={t("form.name")}
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          label={t("form.email")}
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <Input
                        id="subject"
                        name="subject"
                        label={t("form.subject")}
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      />
                      <Textarea
                        id="message"
                        name="message"
                        label={t("form.message")}
                        placeholder="Tell us more about your question..."
                        rows={6}
                        value={formData.message}
                        onChange={handleChange}
                        required
                      />
                      <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">
                        <Send className="h-4 w-4" />
                        {t("form.submit")}
                      </Button>
                    </form>
                  )}
                </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                {/* Email */}
                <Card className="group hover:border-primary/20">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-navy mb-1">
                        Email
                      </h3>
                      <a
                        href={`mailto:${t("info.email")}`}
                        className="text-primary hover:underline text-sm"
                      >
                        {t("info.email")}
                      </a>
                      <p className="text-gray-400 text-xs mt-1">
                        We respond within 24 hours
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Location */}
                <Card className="group hover:border-primary/20">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-navy mb-1">
                        Location
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {t("info.location")}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Remote-first team
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Social Links */}
                <Card className="group hover:border-primary/20">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-navy mb-1">
                        {t("info.social")}
                      </h3>
                      <div className="flex flex-col gap-1.5 mt-1">
                        <a href="https://t.me/winfactpicks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Telegram
                        </a>
                        <a href="https://www.instagram.com/winfact_picks/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Instagram
                        </a>
                        <a href="https://www.facebook.com/winfactpicks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Facebook
                        </a>
                        <a href="https://www.tiktok.com/@winfact_sports" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          TikTok
                        </a>
                        <a href="https://x.com/winfactpicks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          X (Twitter)
                        </a>
                        <a href="https://www.youtube.com/@WinFactPicks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          YouTube
                        </a>
                        <a href="https://www.threads.com/@winfact_picks" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                          Threads
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
            </AnimatedSection>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
