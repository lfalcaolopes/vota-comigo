import { PgDialect } from 'drizzle-orm/pg-core';

import {
  SEMANTIC_CANDIDATE_LIMIT,
  toSearchSql,
} from '../repository/proposicoes-search.condition';

const dialect = new PgDialect();
const EMBEDDING = [0.1, 0.2, 0.3];

function render(sql: ReturnType<typeof toSearchSql>['where']) {
  const query = dialect.sqlToQuery(sql);
  return { sql: query.sql, params: query.params };
}

describe('toSearchSql', () => {
  describe('when the plan is semantic', () => {
    it('ranks by cosine distance instead of filtering by text', () => {
      // Arrange & Act
      const search = toSearchSql({ kind: 'semantic', embedding: EMBEDDING });

      // Assert
      expect(search.orderBy).not.toBeNull();
      expect(render(search.orderBy!).sql).toContain('<=>');
      expect(render(search.where).sql).not.toContain('like');
    });

    it('cuts the candidates by proximity so the total stays bounded', () => {
      // Arrange & Act
      const search = toSearchSql({ kind: 'semantic', embedding: EMBEDDING });

      // Assert
      const { sql, params } = render(search.where);
      expect(sql).toContain('order by');
      expect(sql).toContain('limit');
      expect(params).toContain(SEMANTIC_CANDIDATE_LIMIT);
    });

    it('restricts the candidates to the computable set', () => {
      // Arrange & Act
      const search = toSearchSql({ kind: 'semantic', embedding: EMBEDDING });

      // Assert
      const { sql } = render(search.where);
      expect(sql).toContain('"proposicao_computavel" "candidato_computavel"');
      expect(sql).toContain('"candidato_computavel"."proposicao_id"');
    });

    it('names the table behind each subquery alias', () => {
      // Arrange & Act
      const search = toSearchSql({ kind: 'semantic', embedding: EMBEDDING });

      // Assert
      expect(render(search.where).sql).toContain(
        'from "proposicao_embedding" "candidato_embedding"',
      );
    });

    it('filters by tema before ranking, not after', () => {
      // Arrange & Act
      const comTema = toSearchSql(
        { kind: 'semantic', embedding: EMBEDDING },
        { tema: 34 },
      );
      const semTema = toSearchSql({ kind: 'semantic', embedding: EMBEDDING });

      // Assert
      const rendered = render(comTema.where);
      expect(rendered.sql).toContain('proposicao_tema');
      expect(rendered.sql.indexOf('proposicao_tema')).toBeLessThan(
        rendered.sql.indexOf('order by'),
      );
      expect(rendered.params).toContain(34);
      expect(render(semTema.where).sql).not.toContain('proposicao_tema');
    });

    it('passes the query vector as a vector, not as text', () => {
      // Arrange & Act
      const search = toSearchSql({ kind: 'semantic', embedding: EMBEDDING });

      // Assert
      expect(render(search.where).sql).toContain('::vector');
      expect(render(search.where).params).toContain(JSON.stringify(EMBEDDING));
    });
  });

  describe('when the plan is a token match', () => {
    it('keeps the text filter and leaves the feed ordenacao alone', () => {
      // Arrange & Act
      const search = toSearchSql({ kind: 'tokens', tokens: ['saude'] });

      // Assert
      expect(search.orderBy).toBeNull();
      const { sql, params } = render(search.where);
      expect(sql).toContain('like');
      expect(params).toContain('%saude%');
    });
  });

  describe('when the plan is a citation', () => {
    it('looks the identifier up and leaves the ordenacao alone', () => {
      // Arrange & Act
      const search = toSearchSql({
        kind: 'citation',
        citation: { siglaTipo: 'pec', numero: '3', ano: '2021' },
      });

      // Assert
      expect(search.orderBy).toBeNull();
      const { sql, params } = render(search.where);
      expect(sql).not.toContain('like');
      expect(params).toEqual(expect.arrayContaining([3, 'pec', 2021]));
    });
  });
});
